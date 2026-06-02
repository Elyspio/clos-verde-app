using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IFeedbackService"/>. Validates input, binds optional attachments
/// (reusing the message attachment infrastructure), persists, and emits SignalR events to admins.
/// </summary>
public class FeedbackService(
	IFeedbackRepository feedbackRepository,
	IAttachmentService attachmentService,
	IFeedbackRealtimePublisher feedbackRealtimePublisher,
	ILogger<FeedbackService> logger
) : TracingService(logger), IFeedbackService
{
	private const int MaxPageSize = 100;
	private const int DefaultPageSize = 20;

	public async Task<Feedback> Create(
		CreateFeedbackRequest request,
		Guid authorId,
		string authorDisplayName,
		string? authorEmail)
	{
		using var _ = LogService($"{Log.F(request.Category)} {Log.F(authorId)} attachments={request.AttachmentIds.Count}");

		var title = (request.Title ?? string.Empty).Trim();
		var body = (request.Body ?? string.Empty).Trim();

		if (string.IsNullOrWhiteSpace(title))
			throw new HttpException.BadRequest("Le titre est requis.");
		if (title.Length > 120)
			throw new HttpException.BadRequest("Le titre est trop long (120 caractères maximum).");
		if (string.IsNullOrWhiteSpace(body))
			throw new HttpException.BadRequest("La description est requise.");
		if (body.Length > 4000)
			throw new HttpException.BadRequest("La description est trop longue (4000 caractères maximum).");

		var distinctAttachmentIds = request.AttachmentIds.Distinct().ToList();
		if (distinctAttachmentIds.Count != request.AttachmentIds.Count)
			throw new HttpException.BadRequest("Une pièce jointe est référencée plusieurs fois.");

		var attachments = new List<MessageAttachmentEntity>(distinctAttachmentIds.Count);
		foreach (var attachmentId in distinctAttachmentIds)
		{
			var metadata = await attachmentService.RequireOwnedByUploader(attachmentId, authorId);
			attachments.Add(new MessageAttachmentEntity
			{
				Id = attachmentId.AsObjectId(),
				FileName = metadata.FileName,
				ContentType = metadata.ContentType,
				SizeBytes = metadata.SizeBytes,
			});
		}

		var author = new FeedbackAuthor
		{
			Id = authorId,
			DisplayName = string.IsNullOrWhiteSpace(authorDisplayName) ? "Anonyme" : authorDisplayName,
			Email = string.IsNullOrWhiteSpace(authorEmail) ? null : authorEmail
		};

		var context = request.Context is null
			? null
			: new FeedbackContext
			{
				Url = string.IsNullOrWhiteSpace(request.Context.Url) ? null : request.Context.Url,
				UserAgent = string.IsNullOrWhiteSpace(request.Context.UserAgent) ? null : request.Context.UserAgent,
				AppVersion = string.IsNullOrWhiteSpace(request.Context.AppVersion) ? null : request.Context.AppVersion,
			};

		var entity = await feedbackRepository.Create(request.Category, title, body, author, attachments, context);

		var feedback = ToTransport(entity);
		await feedbackRealtimePublisher.PublishFeedbackCreated(feedback);
		return feedback;
	}

	public async Task<FeedbackListResult> List(FeedbackCategory? category, FeedbackStatus? status, int page, int pageSize)
	{
		using var _ = LogService($"{Log.F(category)} {Log.F(status)} {Log.F(page)} {Log.F(pageSize)}");

		var clampedPage = Math.Max(1, page);
		var clampedSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
		var skip = (clampedPage - 1) * clampedSize;

		var entities = await feedbackRepository.List(category, status, skip, clampedSize);
		var total = await feedbackRepository.Count(category, status);

		return new FeedbackListResult
		{
			Items = entities.Select(e => ToTransport(e)).ToList(),
			Total = total,
			Page = clampedPage,
			PageSize = clampedSize,
		};
	}

	public async Task<FeedbackListResult> ListMine(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses, int page, int pageSize)
	{
		using var _ = LogService($"{Log.F(authorId)} statuses={statuses?.Count ?? 0} {Log.F(page)} {Log.F(pageSize)}");

		var clampedPage = Math.Max(1, page);
		var clampedSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
		var skip = (clampedPage - 1) * clampedSize;
		var distinctStatuses = statuses?.Distinct().ToArray();

		var entities = await feedbackRepository.ListByAuthor(authorId, distinctStatuses, skip, clampedSize);
		var total = await feedbackRepository.CountByAuthor(authorId, distinctStatuses);

		return new FeedbackListResult
		{
			Items = entities.Select(e => ToTransport(e, false)).ToList(),
			Total = total,
			Page = clampedPage,
			PageSize = clampedSize,
		};
	}

	public async Task<Feedback> CloseMine(Guid id, Guid authorId)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(authorId)}");

		var existing = await feedbackRepository.GetById(id)
			?? throw new HttpException.NotFound<FeedbackEntity>(id);

		if (existing.Author.Id != authorId)
			throw new HttpException.Forbidden("Vous ne pouvez clôturer que vos propres tickets.");

		var resolvedAt = existing.ResolvedAt ?? DateTime.UtcNow;
		var updated = await feedbackRepository.UpdateStatus(id, FeedbackStatus.Resolved, existing.AdminNote, resolvedAt)
			?? throw new HttpException.NotFound<FeedbackEntity>(id);

		var feedback = ToTransport(updated, includeAdminNote: false);
		await feedbackRealtimePublisher.PublishFeedbackUpdated(feedback);
		return feedback;
	}

	public async Task<Feedback> UpdateStatus(Guid id, FeedbackStatus newStatus, string? adminNote)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(newStatus)}");

		var existing = await feedbackRepository.GetById(id)
			?? throw new HttpException.NotFound<FeedbackEntity>(id);

		var resolvedAt = newStatus == FeedbackStatus.Resolved
			? existing.ResolvedAt ?? DateTime.UtcNow
			: (DateTime?)null;

		var note = string.IsNullOrWhiteSpace(adminNote) ? null : adminNote.Trim();
		if (note is not null && note.Length > 2000)
			throw new HttpException.BadRequest("La note admin est trop longue (2000 caractères maximum).");

		var updated = await feedbackRepository.UpdateStatus(id, newStatus, note, resolvedAt)
			?? throw new HttpException.NotFound<FeedbackEntity>(id);

		var feedback = ToTransport(updated);
		await feedbackRealtimePublisher.PublishFeedbackUpdated(feedback);
		return feedback;
	}

	public async Task<Feedback> AddReply(Guid id, string body, Guid authorId, string authorDisplayName, bool isAdmin)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(authorId)} {Log.F(isAdmin)}");

		var text = (body ?? string.Empty).Trim();
		if (string.IsNullOrWhiteSpace(text))
			throw new HttpException.BadRequest("La réponse est requise.");
		if (text.Length > 4000)
			throw new HttpException.BadRequest("La réponse est trop longue (4000 caractères maximum).");

		var reply = new FeedbackReply
		{
			Id = ObjectId.GenerateNewId(),
			AuthorId = authorId,
			AuthorDisplayName = string.IsNullOrWhiteSpace(authorDisplayName) ? "Anonyme" : authorDisplayName,
			IsAdmin = isAdmin,
			Body = text,
		};

		var updated = await feedbackRepository.AddReply(id, reply)
			?? throw new HttpException.NotFound<FeedbackEntity>(id);

		var feedback = ToTransport(updated);
		await feedbackRealtimePublisher.PublishFeedbackUpdated(feedback);
		return feedback;
	}

	public async Task<Feedback?> GetById(Guid id)
	{
		using var _ = LogService($"{Log.F(id)}");
		var entity = await feedbackRepository.GetById(id);
		return entity is null ? null : ToTransport(entity);
	}

	public async Task EnsureAttachmentReadable(Guid attachmentId, Guid currentUserId, bool isAdmin)
	{
		using var _ = LogService($"{Log.F(attachmentId)} {Log.F(currentUserId)} {Log.F(isAdmin)}");

		if (isAdmin) return;

		var feedback = await feedbackRepository.FindByAttachmentId(attachmentId);
		if (feedback is null) return; // not a feedback attachment → governed by shared-topic rules

		if (feedback.Author.Id != currentUserId)
			throw new HttpException.Forbidden("Cette pièce jointe n'est pas accessible.");
	}

	internal Feedback ToTransport(FeedbackEntity e, bool includeAdminNote = true) => new()
	{
		Id = e.Id.AsGuid(),
		Category = e.Category,
		Status = e.Status,
		Title = e.Title,
		Body = e.Body,
		Author = new FeedbackAuthorDto
		{
			Id = e.Author.Id,
			DisplayName = e.Author.DisplayName,
			Email = e.Author.Email,
		},
		Attachments = e.Attachments.Select(MapAttachment).ToList(),
		Context = e.Context is null ? null : new FeedbackContextDto
		{
			Url = e.Context.Url,
			UserAgent = e.Context.UserAgent,
			AppVersion = e.Context.AppVersion,
		},
		Replies = e.Replies.Select(r => new FeedbackReplyDto
		{
			Id = r.Id.AsGuid(),
			AuthorDisplayName = r.AuthorDisplayName,
			IsAdmin = r.IsAdmin,
			Body = r.Body,
			CreatedAt = r.CreatedAt,
		}).ToList(),
		CreatedAt = e.CreatedAt,
		ResolvedAt = e.ResolvedAt,
		AdminNote = includeAdminNote ? e.AdminNote : null,
	};

	private Attachment MapAttachment(MessageAttachmentEntity a) => attachmentService.ToTransport(new AttachmentMetadata
	{
		Id = a.Id.AsGuid(),
		FileName = a.FileName,
		ContentType = a.ContentType,
		SizeBytes = a.SizeBytes,
		UploaderUserId = Guid.Empty,
		UploadedAt = a.Id.CreationTime.AsUtc(),
	});
}

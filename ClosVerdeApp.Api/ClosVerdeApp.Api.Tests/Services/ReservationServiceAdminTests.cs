using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using ClosVerdeApp.Api.Core.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using Shouldly;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Services;

/// <summary>
/// Authorization tests for admin overrides on <see cref="ReservationService.Update"/> and
/// <see cref="ReservationService.Delete"/>. Admins may act on any user's reservation; regular
/// users remain limited to their own.
/// </summary>
public class ReservationServiceAdminTests
{
	[Fact]
	public async Task AdminCanDeleteAnotherUsersReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Validated);

		await harness.Service.Delete(reservation.Id.AsGuid(), Guid.NewGuid(), isAdmin: true);

		harness.Repo.Items.ShouldBeEmpty();
		harness.Publisher.Deleted.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task NonAdminCannotDeleteAnotherUsersReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Validated);

		var ex = await Should.ThrowAsync<HttpException>(
			() => harness.Service.Delete(reservation.Id.AsGuid(), Guid.NewGuid(), isAdmin: false));

		ex.ShouldBeOfType<HttpException.Forbidden>();
		harness.Repo.Items.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task AdminCanUpdateAnotherUsersReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Pending);

		var newStart = DateTime.UtcNow.AddDays(3);
		var newEnd = newStart.AddHours(2);
		var updated = await harness.Service.Update(
			reservation.Id.AsGuid(),
			new CreateReservationRequest { StartDate = newStart, EndDate = newEnd },
			Guid.NewGuid(),
			isAdmin: true);

		updated.StartDate.ShouldBe(newStart, TimeSpan.FromSeconds(1));
		harness.Publisher.Updated.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task AdminCanUpdateAlreadyValidatedReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Validated);

		var newStart = DateTime.UtcNow.AddDays(3);
		var newEnd = newStart.AddHours(2);
		await Should.NotThrowAsync(() => harness.Service.Update(
			reservation.Id.AsGuid(),
			new CreateReservationRequest { StartDate = newStart, EndDate = newEnd },
			Guid.NewGuid(),
			isAdmin: true));
	}

	[Fact]
	public async Task NonAdminCannotUpdateAnotherUsersReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Pending);

		var newStart = DateTime.UtcNow.AddDays(3);
		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Update(
			reservation.Id.AsGuid(),
			new CreateReservationRequest { StartDate = newStart, EndDate = newStart.AddHours(2) },
			Guid.NewGuid(),
			isAdmin: false));

		ex.ShouldBeOfType<HttpException.Forbidden>();
	}

	[Fact]
	public async Task AdminCanForceValidateAnotherUsersReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Pending);

		var validated = await harness.Service.ForceValidate(reservation.Id.AsGuid(), Guid.NewGuid(), isAdmin: true);

		validated.Validation.Status.ShouldBe(ReservationStatus.Validated);
		harness.Publisher.Updated.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task NonAdminCannotForceValidateAnotherUsersReservation()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var reservation = harness.Repo.Seed(ownerId, "Bob", ReservationStatus.Pending);

		var ex = await Should.ThrowAsync<HttpException>(
			() => harness.Service.ForceValidate(reservation.Id.AsGuid(), Guid.NewGuid(), isAdmin: false));

		ex.ShouldBeOfType<HttpException.Forbidden>();
		reservation.Validation.Status.ShouldBe(ReservationStatus.Pending);
	}

	[Fact]
	public async Task AdminCanCreateReservationForAnotherUser()
	{
		var harness = new Harness();
		var targetId = Guid.NewGuid();
		harness.Directory.Users.Add(new DirectoryUser { Id = targetId, DisplayName = "Bob" });

		var start = DateTime.UtcNow.AddDays(2);
		var reservation = await harness.Service.Create(
			new CreateReservationRequest { StartDate = start, EndDate = start.AddHours(2), OnBehalfOfUserId = targetId },
			Guid.NewGuid(),
			"Admin",
			isAdmin: true);

		reservation.User.Id.ShouldBe(targetId);
		reservation.User.DisplayName.ShouldBe("Bob");
		harness.Publisher.Created.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task NonAdminCannotCreateReservationForAnotherUser()
	{
		var harness = new Harness();
		var targetId = Guid.NewGuid();
		harness.Directory.Users.Add(new DirectoryUser { Id = targetId, DisplayName = "Bob" });

		var start = DateTime.UtcNow.AddDays(2);
		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateReservationRequest { StartDate = start, EndDate = start.AddHours(2), OnBehalfOfUserId = targetId },
			Guid.NewGuid(),
			"Mallory",
			isAdmin: false));

		ex.ShouldBeOfType<HttpException.Forbidden>();
		harness.Repo.Items.ShouldBeEmpty();
	}

	[Fact]
	public async Task AdminCreateForUnknownUserIsRejected()
	{
		var harness = new Harness();

		var start = DateTime.UtcNow.AddDays(2);
		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateReservationRequest { StartDate = start, EndDate = start.AddHours(2), OnBehalfOfUserId = Guid.NewGuid() },
			Guid.NewGuid(),
			"Admin",
			isAdmin: true));

		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	private sealed class Harness
	{
		public FakeReservationRepository Repo { get; } = new();
		public FakeReservationPublisher Publisher { get; } = new();
		public FakeUserDirectory Directory { get; } = new();
		public FakeBackgroundDispatcher Dispatcher { get; } = new();
		public ReservationService Service { get; }

		public Harness()
		{
			Service = new ReservationService(
				Repo,
				topicRepository: null!,
				messageRepository: null!,
				messageService: null!,
				Publisher,
				messageRealtimePublisher: null!,
				pushNotificationService: null!,
				Directory,
				Dispatcher,
				new StaticOptionsMonitor<ReservationOptions>(new ReservationOptions()),
				NullLogger<ReservationService>.Instance);
		}
	}

	private sealed class FakeUserDirectory : IUserDirectoryService
	{
		public List<DirectoryUser> Users { get; } = [];

		public Task<List<DirectoryUser>> ListAsync(CancellationToken cancellationToken = default) =>
			Task.FromResult(Users);
	}

	private sealed class FakeBackgroundDispatcher : IBackgroundDispatcher
	{
		// No-op: the enqueued push fan-out is irrelevant here (and the push service is not wired up).
		public void Enqueue(Func<CancellationToken, Task> work, string description) { }
	}

	private sealed class FakeReservationPublisher : IReservationRealtimePublisher
	{
		public List<Reservation> Created { get; } = [];
		public List<Reservation> Updated { get; } = [];
		public List<Reservation> Deleted { get; } = [];

		public Task PublishCreated(Reservation reservation)
		{
			Created.Add(reservation);
			return Task.CompletedTask;
		}

		public Task PublishUpdated(Reservation reservation)
		{
			Updated.Add(reservation);
			return Task.CompletedTask;
		}

		public Task PublishDeleted(Reservation reservation)
		{
			Deleted.Add(reservation);
			return Task.CompletedTask;
		}
	}

	private sealed class StaticOptionsMonitor<T>(T value) : IOptionsMonitor<T>
	{
		public T CurrentValue { get; } = value;
		public T Get(string? name) => CurrentValue;
		public IDisposable? OnChange(Action<T, string?> listener) => null;
	}

	private sealed class FakeReservationRepository : IReservationRepository
	{
		public List<ReservationEntity> Items { get; } = [];

		public ReservationEntity Seed(Guid ownerId, string displayName, ReservationStatus status)
		{
			var entity = new ReservationEntity
			{
				Id = ObjectId.GenerateNewId(),
				User = new ReservationUserRef { Id = ownerId, DisplayName = displayName },
				StartDate = DateTime.UtcNow.AddDays(2),
				EndDate = DateTime.UtcNow.AddDays(2).AddHours(1),
				Validation = new ReservationValidation { Status = status, Deadline = DateTime.UtcNow.AddHours(1) },
			};
			Items.Add(entity);
			return entity;
		}

		public Task<ReservationEntity?> GetById(Guid id) =>
			Task.FromResult(Items.FirstOrDefault(r => r.Id.AsGuid() == id));

		public Task<List<ReservationEntity>> GetOverlapping(DateTime start, DateTime end, Guid? excludeId = null) =>
			Task.FromResult(new List<ReservationEntity>());

		public Task<ReservationEntity> Update(Guid id, DateTime start, DateTime end, string? note, DateTime newDeadline)
		{
			var entity = Items.First(r => r.Id.AsGuid() == id);
			entity.StartDate = start;
			entity.EndDate = end;
			entity.Note = note;
			entity.Validation.Deadline = newDeadline;
			return Task.FromResult(entity);
		}

		public Task Delete(Guid id)
		{
			Items.RemoveAll(r => r.Id.AsGuid() == id);
			return Task.CompletedTask;
		}

		public Task<bool> TryForceValidate(Guid id, DateTime atUtc)
		{
			var entity = Items.FirstOrDefault(r => r.Id.AsGuid() == id);
			if (entity is null || entity.Validation.Status != ReservationStatus.Pending) return Task.FromResult(false);
			entity.Validation.Status = ReservationStatus.Validated;
			entity.Validation.ValidatedAt = atUtc;
			return Task.FromResult(true);
		}

		public Task ClearObjection(Guid id) => Task.CompletedTask;

		public Task<ReservationEntity> Create(ReservationUserRef user, DateTime start, DateTime end, string? note, ReservationStatus status, DateTime validationDeadline)
		{
			var entity = new ReservationEntity
			{
				Id = ObjectId.GenerateNewId(),
				User = user,
				StartDate = start,
				EndDate = end,
				Note = note,
				Validation = new ReservationValidation { Status = status, Deadline = validationDeadline },
			};
			Items.Add(entity);
			return Task.FromResult(entity);
		}

		// Unused by the authorization paths under test.
		public Task<List<ReservationEntity>> GetInRange(DateTime from, DateTime to) => throw new NotSupportedException();
		public Task<List<ReservationEntity>> GetAll() => throw new NotSupportedException();
		public Task<List<ReservationEntity>> GetPendingDue(DateTime nowUtc) => throw new NotSupportedException();
		public Task<List<ReservationEntity>> GetPendingExpired(DateTime nowUtc) => throw new NotSupportedException();
		public Task<bool> TryAutoValidate(Guid id, DateTime atUtc) => throw new NotSupportedException();
		public Task<bool> TryAutoCancel(Guid id, DateTime atUtc) => throw new NotSupportedException();
		public Task<bool> TrySetObjection(Guid id, ReservationObjectionEntity objection) => throw new NotSupportedException();
		public Task<bool> TrySetTopicId(Guid id, Guid topicId) => throw new NotSupportedException();
		public Task<bool> ExistsConflictingValidatedOrPending(DateTime start, DateTime end, Guid? excludeId) => throw new NotSupportedException();
	}
}

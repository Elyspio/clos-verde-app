using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>
/// Manages topics: lists them with unread counts, lets users create/rename/delete Custom rooms,
/// and seeds the singleton "Général" topic at startup.
/// </summary>
public interface ITopicService
{
	Task<List<TopicListItem>> ListForUser(Guid currentUserId);
	Task<Topic> GetById(Guid id);
	Task<Topic> CreateCustom(string name, Guid currentUserId, string currentDisplayName);
	Task<Topic> Rename(Guid topicId, string newName, Guid currentUserId);
	Task Delete(Guid topicId, Guid currentUserId);
	Task EnsureGlobalSeeded();
}

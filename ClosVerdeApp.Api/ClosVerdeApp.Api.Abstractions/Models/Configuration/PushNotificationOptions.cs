namespace ClosVerdeApp.Api.Abstractions.Models.Configuration;

/// <summary>Configuration used to send browser Web Push notifications.</summary>
public class PushNotificationOptions
{
	public const string SectionName = "PushNotifications";

	public bool Enabled { get; set; }
	public string Subject { get; set; } = string.Empty;
	public string PublicKey { get; set; } = string.Empty;
	public string PrivateKey { get; set; } = string.Empty;

	public bool HasVapidKeys =>
		!string.IsNullOrWhiteSpace(Subject) &&
		!string.IsNullOrWhiteSpace(PublicKey) &&
		!string.IsNullOrWhiteSpace(PrivateKey);
}

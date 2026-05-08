using System.Text.RegularExpressions;
using Ganss.Xss;

namespace ClosVerdeApp.Api.Core.Helpers;

/// <summary>
/// Server-side HTML sanitisation (whitelist of inline tags + mention spans) and mention-id extraction.
/// Defence-in-depth boundary: anything reaching the database has been through <see cref="Sanitize"/>.
/// </summary>
public static class HtmlContentHelper
{
	private static readonly HtmlSanitizer Sanitizer = BuildSanitizer();

	private static HtmlSanitizer BuildSanitizer()
	{
		var s = new HtmlSanitizer();
		s.AllowedTags.Clear();
		foreach (var tag in new[] { "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "span" })
			s.AllowedTags.Add(tag);

		s.AllowedAttributes.Clear();
		s.AllowedAttributes.Add("href");
		s.AllowedAttributes.Add("class");
		s.AllowedAttributes.Add("data-mention-id");
		s.AllowedAttributes.Add("data-mention-name");

		s.AllowedSchemes.Clear();
		s.AllowedSchemes.Add("http");
		s.AllowedSchemes.Add("https");
		s.AllowedSchemes.Add("mailto");

		s.AllowDataAttributes = false; // we explicitly whitelist the two we need
		return s;
	}

	public static string Sanitize(string html) =>
		string.IsNullOrWhiteSpace(html) ? string.Empty : Sanitizer.Sanitize(html);

	private static readonly Regex MentionRegex = new(
		"data-mention-id=\"([0-9a-fA-F-]{36})\"",
		RegexOptions.Compiled | RegexOptions.IgnoreCase);

	public static List<Guid> ExtractMentions(string sanitizedHtml)
	{
		if (string.IsNullOrEmpty(sanitizedHtml)) return new List<Guid>();
		var ids = new HashSet<Guid>();
		foreach (Match m in MentionRegex.Matches(sanitizedHtml))
		{
			if (Guid.TryParse(m.Groups[1].Value, out var id))
				ids.Add(id);
		}
		return ids.ToList();
	}
}

using AskYourNotes.Application.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace AskYourNotes.Infrastructure.Answers;

// Uses Semantic Kernel + the Google (Gemini) connector for chat completion.
// SK gives us a clean Kernel abstraction over chat -- useful later when we add
// prompt templates, function calling, or middleware.
//
// SKEXP0070 is the "experimental" warning for the Google connector while it's
// still in alpha; we accept it.
#pragma warning disable SKEXP0070
public class GeminiAnswerService : IAnswerService
{
    private const string SystemPrompt = """
        You answer questions strictly from the user's provided notes (the SOURCES below).

        Rules:
        - Use ONLY the SOURCES to answer. Do NOT use general knowledge.
        - If the answer is not present in the SOURCES, reply with exactly:
          "I couldn't find that in your notes."
        - Do not invent facts, names, dates, or numbers.
        - Keep the answer concise and directly relevant to the question.
        """;

    private readonly Kernel _kernel;
    private readonly IChatCompletionService _chat;

    public GeminiAnswerService(IConfiguration config)
    {
        var apiKey = config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException(
                "Missing Gemini:ApiKey. Set it with: " +
                "`dotnet user-secrets --project src/Api set \"Gemini:ApiKey\" \"<your-key>\"`");

        var modelId = config["Gemini:ChatModel"] ?? "gemini-2.5-flash";

        var builder = Kernel.CreateBuilder();
        builder.AddGoogleAIGeminiChatCompletion(modelId: modelId, apiKey: apiKey);
        _kernel = builder.Build();
        _chat = _kernel.GetRequiredService<IChatCompletionService>();
    }

    public async Task<string> AnswerAsync(
        string question,
        IReadOnlyList<SourceChunk> sources,
        CancellationToken ct = default)
    {
        // Assemble the SOURCES block for the prompt. Each source is labelled so
        // the model can refer to specific pieces if needed.
        var sourcesBlock = string.Join("\n\n", sources.Select((s, i) =>
            $"--- Source {i + 1} (file: {s.FileName}, chunk {s.Ordinal}) ---\n{s.Snippet}"));

        var userPrompt = $"""
            SOURCES:
            {sourcesBlock}

            QUESTION: {question}

            Answer using ONLY the SOURCES above.
            If the answer is not in the SOURCES, reply exactly: "I couldn't find that in your notes."
            """;

        var history = new ChatHistory();
        history.AddSystemMessage(SystemPrompt);
        history.AddUserMessage(userPrompt);

        var resp = await _chat.GetChatMessageContentAsync(history, kernel: _kernel, cancellationToken: ct);
        return resp.Content?.Trim() ?? "I couldn't find that in your notes.";
    }
}
#pragma warning restore SKEXP0070

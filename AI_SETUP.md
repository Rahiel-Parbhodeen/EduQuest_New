# Enable live AI in EduQuest

The default setting is **offline practice generation**. It reads uploaded text and creates simple fill-in-the-blank questions. It does not connect to a live AI model.

The Resources page now shows which mode is running. “Preview uploaded text” displays what the app actually extracted. Draft questions show a supporting excerpt that is checked against the uploaded text. This check confirms that the excerpt exists; lecturers should still review the question and correct answer for meaning and accuracy.

## Set up OpenAI in VS Code

1. Sign in to the [OpenAI API platform](https://platform.openai.com/).
2. Open [API keys](https://platform.openai.com/api-keys) and create a key for your project. Store it privately. Do not paste it into this chat or commit it to GitHub.
3. Ensure that your API account has the credit/billing access needed to make requests. API usage can incur charges. Check your account's Usage/Billing pages before enabling it.
4. In VS Code, open the project folder that contains `package.json` and `.env`.
5. Open `.env` and replace the existing values for these lines (avoid duplicate entries):

```dotenv
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=paste_your_own_key_here
```

6. Save the file. In the terminal running the app, press Ctrl+C, then run `npm run dev` again. Restarting reloads the server-side settings.
7. Sign in as a lecturer and open Resources. The banner should show **Live AI generation** and configuration present. This is a configuration check; the first generation request will verify that your key, model access and account credit actually work.
8. Select a module, upload your own material, and click **Preview uploaded text**. Check that the preview matches your document.
9. Request a small quiz (for example, 3 questions), then click **Generate quiz**. Check the questions, options, explanations and supporting source excerpts before publishing.

The configured OpenAI model is supported by the existing Chat Completions adapter; see the [official model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini). This guide uses official OpenAI documentation. No paid model request was made while preparing this update.

## If generation fails

- **Offline practice generator:** the app is still using `AI_PROVIDER=mock` (or `offline`). Edit `.env`, save and restart all services.
- **No readable text:** the PDF may be an image scan. Apply OCR or export the content as TXT/DOCX before uploading. Images and scanned slides are not read by the text extractor.
- **Not enough material:** offline mode needs enough distinct sentences. Request fewer questions or upload more text.
- **AI setup incomplete:** check the model and relevant key are populated in the server's `.env`.
- **Provider could not generate:** check the key, model access, internet connection and API account credit. The UI never exposes the key.
- **Questions could not be linked to the upload:** the provider did not return valid supporting quotations. Try a smaller request or clearer source material. Such responses are not saved as a quiz.

The app sends the extracted learning material to your chosen provider only when a live generation request is made. Keep `.env` out of GitHub; `.env.example` contains placeholders and is safe to share.

## Other providers

Anthropic: set `AI_PROVIDER=anthropic`, `AI_MODEL` to a model your account supports, and `ANTHROPIC_API_KEY`.

OpenAI-compatible service: set `AI_PROVIDER=openai_compatible`, `AI_MODEL`, `AI_BASE_URL` and `AI_API_KEY`.

To return to offline practice, set `AI_PROVIDER=mock` and restart the app.

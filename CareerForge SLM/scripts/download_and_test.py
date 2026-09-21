from mlx_lm import generate, load

MODEL_ID = "mlx-community/Qwen3-4B-Instruct-2507-4bit"


def main() -> None:
    print(f"Downloading/loading {MODEL_ID} ...")
    model, tokenizer = load(MODEL_ID)

    messages = [
        {
            "role": "user",
            "content": "Return only this JSON object: {\"status\": \"ready\"}",
        }
    ]
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    result = generate(
        model,
        tokenizer,
        prompt=prompt,
        max_tokens=64,
        verbose=True,
    )
    print("\nRaw response:")
    print(result)


if __name__ == "__main__":
    main()

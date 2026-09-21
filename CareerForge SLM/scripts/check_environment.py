import platform
import sys

import mlx.core as mx


def main() -> None:
    machine = platform.machine()
    print(f"Python: {sys.version.split()[0]}")
    print(f"Machine architecture: {machine}")
    print(f"macOS: {platform.mac_ver()[0]}")
    print(f"MLX default device: {mx.default_device()}")

    if machine != "arm64":
        raise SystemExit("This starter requires an Apple Silicon arm64 Mac.")

    # Force a tiny Metal-backed operation and materialize the result.
    value = mx.sum(mx.arange(10))
    mx.eval(value)
    print(f"MLX test result: {value.item()} (expected 45)")


if __name__ == "__main__":
    main()

import os
import threading
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from biomni.agent import A1

from biomni.tool.database import query_clinvar

# Load environment variables from .env if present
load_dotenv()


def create_agent() -> Any:
    data_path = os.getenv("BIOMNI_DATA_PATH", "./data")
    # Model selection: can be set via BIOMNI_MODEL (e.g., "claude-sonnet-4-20250514" or "azure-gpt-4o")
    model_name = os.getenv("BIOMNI_MODEL", "gpt-5-2025-08-07")
    # LLM source auto-detected by biomni.llm.get_llm; can override with LLM_SOURCE
    source = "OpenAI"
    api_key = os.getenv("OPENAI_API_KEY")

    # NOTE: A1 init will ensure data directories and download missing assets on first run (~11GB)
    return A1(
        path=data_path,
        llm=model_name,
        source=source,  # type: ignore[arg-type]
        api_key=api_key,
    )


app = Flask(__name__)

# Create a single shared agent instance at server startup
agent = create_agent()
agent_lock = threading.Lock()


@app.get("/health")
def health() -> Any:
    return jsonify({"status": "ok"})


@app.post("/go")
def go() -> Any:
    print("recieved request", request)
    try:
        payload: dict[str, Any] = request.get_json(force=True)
        prompt = payload.get("prompt")
        if not prompt:
            return jsonify({"error": "Missing 'prompt'"}), 400

        with agent_lock:
            log, final = agent.go(str(prompt))

        response: dict[str, Any] = {"final": final}
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/clinvar")
def clinvar() -> Any:
    print("recieved request", request)
    try:
        payload: dict[str, Any] = request.get_json(force=True)
        search_query = payload.get("search_query")
        if not search_query:
            return jsonify({"error": "Missing 'search_query'"}), 400

        with agent_lock:
            # final = query_clinvar(prompt=search_query, model="gpt-5-2025-08-07")
            final = query_clinvar(prompt=search_query, model="gpt-5-nano-2025-08-07")

        response: dict[str, Any] = {"final": final}
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "8080"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"}
    # Flask's built-in server is fine for local/dev. Use gunicorn/uwsgi for production.
    app.run(host=host, port=port, debug=debug, threaded=True)

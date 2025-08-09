## Reti: The World's First GPT-5-Powered AI Medical Geneticist

Backed by Reticular, built by John Yang, Charlie Luo, Sophie Wang, and Vineet Sharma



### Setup


Download conda/miniconda from [here](https://docs.anaconda.com/miniconda/install/)


Follow the instructions here (copied from biomni-app/README.md) to install the dependencies.
```bash
cd biomni-app
conda env create -f environment.yml
conda activate biomni_e1
pip install biomni --upgrade
```

Run the flask server
```bash
flask --app flask_server.py run --debug
```

You should now be able to access the server at `http://localhost:5000/go`. To test, try this curl command while running the server:

```bash
curl -sS -X POST 'http://127.0.0.1:5000/go'   -H 'Content-Type: application/json' --data-raw '{"prompt":"Plan a CRISPR screen to identify genes that regulate T cell exhaustion, measured by the change in T cell receptor (TCR) signaling between acute (interleukin-2 [IL-2] only) and chronic (anti-CD3 and IL-2) stimulation conditions. Generate 32 genes that maximize the perturbation effect."}'
```
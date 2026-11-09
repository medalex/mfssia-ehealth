# MFSSIA DKG client to interact with DKG node  🛡️

# Tools

- NestJS
- Swagger

## Getting Started

The easiest way to get started is to clone the repository:

# clone the repository

```
git clone https://medalex@bitbucket.org/alexnorta/dkg6_client_js.git
```

# Install NPM dependencies

```
npm install
```

```
npm run build
```

# start the server

```
npm run start
```
## Docker run
To build a docker container use the Docker file in the root folder with the command `docker build -t dkg-client .`

To run the image use command `docker run --rm -p 3000:3000 -it dkg-client`

## Ontology

- `ontology/review-signal.ttl`: review signal ontology (`rs:`), extends `rx-prescription-full.ttl` (`rx:`), which extends the MFSSIA ontology
- `ontology/review-signal-shapes.ttl`: SHACL constraints derived from requirements R1–R4
- `ontology/tests/`: an example signal from the running case and `validate.py`, which checks that each constraint detects its violation

To run the tests:

```
pip install rdflib pyshacl && python ontology/tests/validate.py
```

## Links

- Swagger: http://localhost:4000/docs
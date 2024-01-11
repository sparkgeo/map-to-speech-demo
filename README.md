# map-to-speech-demo
An application showing map-to-speech method

```mermaid
sequenceDiagram
    participant app
    participant api
    participant OpenAI_API

    app->>api: Request
    api->>OpenAI_API: Text Request
    OpenAI_API-->>api: Response
    api->>OpenAI_API: Audio Request (optional)
    OpenAI_API-->>api: Response
    api-->>app: Response
```

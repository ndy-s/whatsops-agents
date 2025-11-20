export function handleClassifierResult(validated) {
    const selectedAgent = validated.content?.agent;
    const confidence = validated.content?.confidence ?? null;

    return { agent: selectedAgent, confidence };
}



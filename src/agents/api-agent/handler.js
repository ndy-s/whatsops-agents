export function handleApiResult(validated) {
    if (validated.type === "message") {
        return {
            type: "text",
            messages: [validated.content.message],
        };
    }

    if (validated.type === "api_action") {
        return {
            type: "pending",
            message: validated.content.message || null,
            actions: validated.content.apis || []
        };
    }

    return { type: "text", messages: ["Unexpected response type."] }
}

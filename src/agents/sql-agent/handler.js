export function handleSqlResult(validated) {
    if (validated.type === "message") {
        return {
            type: "text",
            messages: [validated.content.message]
        };
    }

    if (validated.type === "sql_action") {
        return {
            type: "pending",
            message: validated.content.message || null,
            actions: [{
                id: validated.content.id,
                query: validated.content.query,
                params: validated.content.params
            }]
        };
    }

    return { type: "text", messages: ["Unexpected SQL agent response type."] };
}



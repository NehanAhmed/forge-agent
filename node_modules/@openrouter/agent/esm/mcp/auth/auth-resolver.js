export function resolveAuth(auth) {
    if (auth === undefined) {
        return {
            headers: {},
        };
    }
    switch (auth.kind) {
        case 'bearer':
            return {
                headers: {
                    Authorization: `Bearer ${auth.token}`,
                },
            };
        case 'headers':
            return {
                headers: {
                    ...auth.headers,
                },
            };
        case 'oauth':
            return {
                headers: {},
                authProvider: auth.provider,
            };
    }
}
//# sourceMappingURL=auth-resolver.js.map
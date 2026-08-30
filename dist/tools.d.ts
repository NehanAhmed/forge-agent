export declare const tools: ({
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                command: {
                    type: string;
                    description: string;
                };
                content?: undefined;
                path?: undefined;
                stringToReplace?: undefined;
                newString?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                command?: undefined;
                path: {
                    type: string;
                    description: string;
                };
                content?: undefined;
                stringToReplace?: undefined;
                newString?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                command?: undefined;
                path: {
                    type: string;
                    description: string;
                };
                content: {
                    type: string;
                    description: string;
                };
                stringToReplace?: undefined;
                newString?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                command?: undefined;
                content?: undefined;
                path: {
                    type: string;
                    description: string;
                };
                stringToReplace: {
                    type: string;
                    description: string;
                };
                newString: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
})[];
//# sourceMappingURL=tools.d.ts.map
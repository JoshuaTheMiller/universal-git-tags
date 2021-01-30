export interface PersonalAccessToken {
    Value: string
    Type: 'PersonalAccessToken'
}

export interface NoCredentials { Type: 'NoCredentials' }

export type GitTagCredentials = PersonalAccessToken | NoCredentials;

export interface TagOptions {
    ServiceUrl: string
    RepoId: string
    CommitHash: string
    TagName: string
    TagMessage: string
    Credentials: GitTagCredentials
    ForcePush: boolean
}

function buildCredentials(credentials: GitTagCredentials) {
    if (credentials.Type == 'PersonalAccessToken') {
        console.log("Using PersonalAccessToken for Auth.")
        return `AUTHORIZATION: Basic ${credentials.Value}`;
    }

    // if (credentials.Type == 'PersonalAccessToken') {
    //     console.log("Using PersonalAccessToken for Auth.")
    //     return `x-oauth-basic: ${credentials.Value}`;
    // }

    console.log("Using no credentials. This most likely will fail, as pushing tags should require credentials...")
    return "";
}

export type ExecutableFunction = (toolName: string, args: string | string[]) => Q.Promise<number>;

type FailureResponse = {
    Succeeded: false,
    FailedCommand: string
    Message: string
}

type SuccessResponse = {
    Succeeded: true,
}

type Response = SuccessResponse | FailureResponse;

export async function addTag(options: TagOptions, executor: ExecutableFunction): Promise<Response> {
    const repoUrl = `${options.ServiceUrl}/${options.RepoId}.git`;

    const extraHeader = buildCredentials(options.Credentials);

    const forceCommand = options.ForcePush === true ? " --force" : "";
    const tagMessageCommand = options.TagMessage === "" ? "" : ` -m "${options.TagMessage}"`;
    const orderedCommands = [
        { name: "init", command: "init" },
        { name: "name", command: `config user.name "Universal Git Tags"` },
        { name: "email", command: "config user.email universal-git-tags@cloudpup.dev" },
        { name: "extra header", command: `config http.extraheader "${extraHeader}"` },
        { name: "origin", command: `remote add origin ${repoUrl}` },
        { name: "fetch", command: `fetch origin ${options.CommitHash} --depth=1` },
        { name: "tag", command: `tag -a "${options.TagName}"${tagMessageCommand} ${options.CommitHash}${forceCommand}` },
        { name: "push", command: `push origin "${options.TagName}"${forceCommand}` }
    ];

    for (var c of orderedCommands) {
        try {
            await executor("git", c.command);
        }
        catch (e) {
            return {
                Succeeded: false,
                Message: `Error running command '${c.name}': ${(e as Error).message}`,
                FailedCommand: c.name
            }
        }
    }

    return {
        Succeeded: true
    }
}
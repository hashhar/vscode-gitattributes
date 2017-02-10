'use strict';
import * as vscode from 'vscode';
import { Cache, CacheItem } from './cache';

const fs = require('fs');
const GitHubApi = require('github');
const https = require('https');
const url = require('url');

class CancellationError extends Error { }

enum OperationType {
    Append,
    Overwrite
}

interface GitattributesOperation {
    type: OperationType;
    path: string;
    file: GitattributesFile;
}

export interface GitattributesFile extends vscode.QuickPickItem {
    url: string;
}

export class GitattributesRepository {
    private cache: Cache;

    constructor(private client) {
        let config = vscode.workspace.getConfiguration('gitattributes');
        this.cache = new Cache(config.get('cacheExpirationInterval', 86400));
    }

    /**
     * Get all .gitattributes files.
     */
    public getFiles(path: string = ''): Thenable<GitattributesFile[]> {
        return new Promise((resolve, reject) => {
            // If cached, return from the cache.
            let item = this.cache.get('gitattributes/' + path);
            if (typeof item !== 'undefined') {
                resolve(item);
                return;
            }

            // Download .gitattributes files from GitHub.
            this.client.repos.getContent({
                owner: 'alexkaratarakis',
                repo: 'gitattributes',
                path: path
            }, (err, response) => {
                if (err) {
                    reject(`${err.code}: ${err.message}`);
                    return;
                }

                console.log(`vscode-gitattributes: GitHub API ratelimit remaining:
                ${response.meta['x-ratelimit-remaining']}`);

                let files = response.filter(file => {
                    return (file.type === 'file' && file.name !== '.gitattributes' &&
                        file.name.endsWith('.gitattributes'));
                }).map(file => {
                    return {
                        label: file.name.replace(/\.gitattributes/, ''),
                        description: file.path,
                        url: file.download_url
                    };
                });

                // Cache the retreived gitattributes files.
                this.cache.add(new CacheItem('gitattributes/' + path, files));

                resolve(files);
            });
        });
    }

    /**
     * Downloads a .gitattributes from the repository to the path passed
     */
    public download(operation: GitattributesOperation): Thenable<GitattributesOperation> {
        return new Promise((resolve, reject) => {
            let flags = operation.type === OperationType.Overwrite ? 'w' : 'a';
            let file = fs.createWriteStream(operation.path, { flags: flags });

            // If appending to the existing .gitattributes file, write a NEWLINE as a separator
            if (flags === 'a') {
                file.write('\n');
            }

            let options = url.parse(operation.file.url);
            options.agent = getAgent(); // Proxy
            options.headers = {
                'User-Agent': userAgent
            };

            let request = https.get(options, response => {
                response.pipe(file);

                file.on('finish', () => {
                    file.close(() => {
                        if (flags === 'a') {
                            let newFilename = deduplicate(operation);
                            fs.unlink(operation.path);
                            fs.rename(newFilename, operation.path);
                        }
                        resolve(operation);
                    });
                });
            }).on('error', err => {
                // Delete the .gitattributes file if we created it.
                if (flags === 'w') {
                    fs.unlink(operation.path);
                }
                reject(err.message);
            });
        });
    }
}

/**
 * Remove "* text=auto" if already present.
 */
function deduplicate(operation: GitattributesOperation) {
    let found = false;
    let newPath = operation.path + '.new';
    let newFile = fs.createWriteStream(newPath, { flags: 'w' });
    let re = new RegExp('\\* text=auto');
    fs.readFileSync(operation.path).toString().split('\n').forEach(function (line: string) {
        if (!line.match(re)) {
            newFile.write(line.toString() + '\n');
        } else if (!found) {
            newFile.write(line.toString() + '\n');
            found = true;
        } else {
            newFile.write('# Commented because this line appears before in the file.\n');
            newFile.write('# ' + line.toString() + '\n');
        }
    });
    return newPath;
}

const userAgent = 'vscode-gitattributes-extension';

// Read proxy configuration.
let httpConfig = vscode.workspace.getConfiguration('http');
let proxy = httpConfig.get('proxy', undefined);

console.log(`vscode-gitattributes: using proxy ${proxy}`);

// Create a GitHub API client.
let client = new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    host: 'api.github.com',
    //debug: true,
    pathPrefix: '',
    timeout: 100000,
    headers: {
        'User-Agent': userAgent
    },
    proxy: proxy
});

// Create a gitattributes repository.
let gitattributesRepository = new GitattributesRepository(client);

let agent;

function getAgent() {
    if (agent) {
        return agent;
    }

    // Read proxy url in the following order: vscode settings, environment variables
    proxy = proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

    if (proxy) {
        var HttpsProxyAgent = require('https-proxy-agent');
        agent = new HttpsProxyAgent(proxy);
    }

    return agent;
}

function getGitattributesFiles() {
    // Get list of .gitattributes files from GitHub.
    return Promise.all([
        gitattributesRepository.getFiles()
    ]).then((result) => {
        let files: GitattributesFile[] = Array.prototype.concat.apply([], result).sort((a, b) =>
            a.label.localeCompare(b.label));
        return files;
    });
}

function promptForOperation() {
    return vscode.window.showQuickPick([
        {
            label: 'Append',
            description: 'Append to existing .gitattributes file'
        },
        {
            label: 'Overwrite',
            description: 'Overwrite exiting .gitattributes file'
        }
    ]);
}

function showSuccessMessage(operation: GitattributesOperation) {
    switch (operation.type) {
        case OperationType.Append:
            return vscode.window.showInformationMessage(`Appended ${operation.file.description} to the existing
            .gitattributes in the project root`);
        case OperationType.Overwrite:
            return vscode.window.showInformationMessage(`Created .gitattributes file in the project root based on
            ${operation.file.description}`);
        default:
            throw new Error('Unsupported operation');
    }
}

export function activate(context: vscode.ExtensionContext) {

    console.log('gitattributes: extension is now active!');

    let disposable = vscode.commands.registerCommand('addgitattributes', () => {
        // Check if we are in a workspace.
        if (!vscode.workspace.rootPath) {
            vscode.window.showErrorMessage('No workspace open. Please open a workspace to use this command.');
            return;
        }

        Promise.resolve()
            .then(() => {
                return vscode.window.showQuickPick(getGitattributesFiles());
            })
            // Check if a gitattributes file exists.
            .then((file: GitattributesFile) => {
                if (!file) {
                    // Cancel
                    throw new CancellationError();
                }

                var path = vscode.workspace.rootPath + '/.gitattributes';

                return new Promise<GitattributesOperation>((resolve, reject) => {
                    // Check if file exists
                    fs.stat(path, (err, stats) => {
                        if (err) {
                            // File does not exist, we can create one.
                            resolve({ path: path, file: file, type: OperationType.Overwrite });
                        } else {
                            promptForOperation().then(operation => {
                                if (!operation) {
                                    // Cancel
                                    reject(new CancellationError());
                                    return;
                                }
                                resolve({ path: path, file: file, type: OperationType[operation.label] });
                            });
                        }
                    });
                });
            })
            // Store the file on file system.
            .then((operation: GitattributesOperation) => {
                return gitattributesRepository.download(operation);
            })
            // Show success message.
            .then((operation) => {
                return showSuccessMessage(operation);
            })
            .catch(reason => {
                if (reason instanceof CancellationError) {
                    return;
                }
                vscode.window.showErrorMessage(reason);
            });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('gitattributes: extension is now deactived.');
}

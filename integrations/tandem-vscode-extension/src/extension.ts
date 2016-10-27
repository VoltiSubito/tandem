"use strict";
// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import { exec, spawn } from "child_process";
import { WrapBus } from "mesh";
import * as vscode from "vscode";
import * as net from "net";
import * as through from "through2";
import * as getPort from "get-port";
import * as createServer from "express";
import { debounce, throttle } from "lodash";
import { NoopBus } from "mesh";

import { SockBus, Dependencies } from "@tandem/common";
import { concatCoreApplicationDependencies } from "@tandem/core";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    // isolate the td process so that it doesn't compete with resources
    // with VSCode.
    const tdproc = spawn(`tandem`, ["--expose-sock-file"], {
        cwd: "node_modules/@tandem/editor/bin"
    });

    tdproc.stdout.pipe(process.stdout);
    tdproc.stderr.pipe(process.stderr);

    const sockFilePath = await new Promise((resolve) => {

        const sockBuffer = [];
        tdproc.stdout.pipe(through(function(chunk, enc:any, callback) {
            const value = String(chunk);

            // TODO - need util function for this
            const match = value.match(/\-+sock file start\-+\n(.*?)\n\-+sock file end\-+/);

            if (match) {
                resolve(match[1])
            }

            callback();
        }))
    });

    const client = net.connect({ path: sockFilePath } as any);

    const bus = new SockBus(client, new NoopBus());

    var _inserted = false;
    var _content;
    var _documentUri:vscode.Uri;
    var _mtime: number = Date.now();
    var _ignoreSelect: boolean;

    async function _setEditorContent({ content, path, mtime }) {

        const editor = vscode.window.activeTextEditor;
        if (mtime < _mtime) return;

        if (editor.document.fileName !== path || editor.document.getText() === content) return;

        let oldText = editor.document.getText();
        var newContent = _content = content;

        _ignoreSelect = true;

        await editor.edit(function(edit) {

            edit.replace(
                new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(oldText.length)
                ),
                newContent
            );
        });

        _ignoreSelect = false;
    }

    const fixFileName = (fileName) => {

        // no extension? add HTML
        if (fileName.split(".")[0] === fileName) {
            fileName += ".html";
        }

        return fileName;
    }

    const _update = throttle(async (document:vscode.TextDocument) => {

        _documentUri = document.uri;
        const editorContent = document.getText();
        const path = fixFileName(document.fileName);

        if (_content === editorContent) return;

        // await UpdateTemporaryFileContentAction.execute({
        //     path: path,
        //     content: _content = editorContent,
        //     ignoreIfNotCached: true
        // }, server.bus);
    }, 25);

    let startServerCommand = vscode.commands.registerCommand("extension.tandemOpenCurrentFile", async () => {

        const doc = vscode.window.activeTextEditor.document;
        const fileName = fixFileName(doc.fileName)

        _update(vscode.window.activeTextEditor.document);

        // await UpdateTemporaryFileContentAction.execute({
        //     path: fileName,
        //     content: _content = doc.getText(),
        //     ignoreIfNotCached: false
        // }, server.bus);

        // const hasOpenWindow = (await OpenProjectAction.execute({
        //     path: fileName
        // }, server.bus));

        // if (!hasOpenWindow) {
        //     exec(`open http://localhost:${port}/editor`);
        // }
    });

    context.subscriptions.push(startServerCommand);

    async function onChange(e:vscode.TextDocumentChangeEvent) {
        const doc  = e.document;
        _mtime    = Date.now();
        // _update(doc);
    }

    async function run(e:vscode.TextEditor) {
        const doc  = e.document;
        const path = fixFileName(doc.fileName);

        const editorContent = doc.getText();

        // const cachedFile = await ReadTemporaryFileContentAction.execute({
        //     path: path
        // }, server.bus);

        // cached content does not match, meaning that it likely changed in the browser
        // if (cachedFile.content !== editorContent) {
        //     try {
        //         await _setEditorContent({ path: doc.fileName, content: cachedFile.content, mtime: cachedFile.mtime });
        //     } catch(e) {
        //         // console.log
        //     }
        // } else {
        //     _update(doc);
        // }
    }

    vscode.window.onDidChangeTextEditorSelection(function(e:vscode.TextEditorSelectionChangeEvent) {
        if (_ignoreSelect) return;
        const ranges = e.selections.map(selection => ({
            start: e.textEditor.document.offsetAt(selection.start),
            end: e.textEditor.document.offsetAt(selection.end)
        }));


        // server.bus.execute(new SelectEntitiesAtSourceOffsetAction(fixFileName(e.textEditor.document.fileName), ...ranges));
    });

    // this needs to be a config setting
    vscode.workspace.onDidChangeTextDocument(onChange);
    vscode.window.onDidChangeActiveTextEditor(run);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
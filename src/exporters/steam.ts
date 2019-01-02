import { Game } from "../game";
import * as fs from "fs";
import * as path from "path";
import { CRC } from 'crc-full';
import long = require("long");
import { IExporter } from "./exporter_iface";
import { exec, spawn } from "child_process";

export class Shortcuter implements IExporter {
    private steamExe = "C:/Program Files (x86)/Steam/Steam.exe";
    public async sync(games: Game[], steamConfig: string): Promise<void> {
        let steamTileFolder = path.join(steamConfig, `grid`);
        let steamShortcutsPath = path.join(steamConfig, `shortcuts.vdf`);
        let shortfile = fs.readFileSync(steamShortcutsPath, "utf8");
        let shorts: Shortcut[] = this.import(shortfile);
        let added = false;
        for (let game of games) {
            try {
                let appId = this.getAppId(game.exec, game.name);
                let tileFile = path.join(steamTileFolder, appId + ".jpg");
                try {
                    fs.copyFileSync(game.tile, tileFile);
                } catch (ex) {
                    console.log("Couldn't copy tile file: ", ex);
                }
                if (!shorts.some(p => p.exe == game.exec)) {
                    let newItem = new Shortcut();
                    newItem.appname = game.name;
                    newItem.exe = game.exec;
                    newItem.shortcutPath = '';
                    newItem.startDir = game.workFolder;
                    newItem.launchOptions = game.args;
                    newItem.icon = game.icon;
                    newItem.tags = [game.tag, "AUTO"];
                    console.log(newItem);
                    added = true;
                    shorts.push(newItem);
                }
            } catch (e) {
                console.log(e, "Error on game", game);
            }
        }
        let removed = shorts.filter(p => p.tags.indexOf("AUTO") != -1 && !games.some(g => g.name == p.appname));
        let outshorts = shorts.filter(p => p.tags.indexOf("AUTO") == -1 || games.some(g => g.name == p.appname));
        if (added || removed.length > 0) {
            let outShort = this.export(outshorts);
            exec(`"${this.steamExe}" -shutdown`, (err, data) => {
                if (err) { console.log("Failed: steam shutdown"); }
                console.log(data.toString());
                setTimeout(() => spawn(this.steamExe, { stdio: 'ignore', detached: true }).unref(), 5000);
            });
            fs.writeFileSync(steamShortcutsPath, outShort);
        }
    }

    private crc = CRC.default("CRC32");
    private regVdf = /^\00shortcuts\00(.*)[\b\b]$/i;
    private regShortcut = /(.*)\00[0-9]+\00(\01appname\00.*)[\b]/i;
    private regAppname = /\01appname\00(.*?)\00/i;
    private regExe = /\01exe\00(.*?)\00/i;
    private regStartDir = /\01startdir\00(.*?)\00/i;
    private regIcon = /\01icon\00(.*?)\00/i;
    private regShortcutPath = /\01shortcutpath\00(.*?)\00/i;
    private regLaunchOptions = /\01launchoptions\00(.*?)\00/i;
    private regHidden = /\02hidden\00(.)\00/i;
    private regTags = /\00tags\00(.*?)[\b]/i;
    private regTag = /\01[0-9]+\00(.*?)\00(.*)/i;

    private import(vdfAsString: string): Shortcut[] {
        let match = this.regVdf.exec(vdfAsString);
        if (!match) {
            throw new Error("Invalid shortcuts.vdf file");
        }
        let shortcutsAsString = match[1]; let shortcuts = [];
        let match1: RegExpExecArray;
        let str = shortcutsAsString;
        while (match1 = this.regShortcut.exec(str)) {
            str = match1[1];
            shortcuts.push(this.parseShortcut(match1[2]));
        }
        shortcuts.reverse();
        return shortcuts;
    }

    private parseShortcut(shortcutAsString: string): Shortcut {
        let appname = this.regAppname.exec(shortcutAsString);
        let exe = this.regExe.exec(shortcutAsString);
        let startDir = this.regStartDir.exec(shortcutAsString);
        let icon = this.regIcon.exec(shortcutAsString);
        let shortcutPath = this.regShortcutPath.exec(shortcutAsString);
        let saunchOptions = this.regLaunchOptions.exec(shortcutAsString);
        let hidden = this.regHidden.exec(shortcutAsString);
        let tags = this.regTags.exec(shortcutAsString);
        let shortcut = new Shortcut();
        shortcut.appname = appname ? appname[1] : "";
        shortcut.exe = exe ? exe[1] : "";
        shortcut.startDir = startDir ? startDir[1] : "";
        shortcut.icon = icon ? icon[1] : "";
        shortcut.launchOptions = saunchOptions ? saunchOptions[1] : "";
        shortcut.shortcutPath = shortcutPath ? shortcutPath[1] : "";
        shortcut.hidden = hidden ? hidden[1] === "\x01" : false;
        shortcut.tags = tags ? this.parseTags(tags[1]) : [];
        return shortcut;
    }

    private parseTags(tagsAsString: string): string[] {
        let tags: string[] = [];
        let match: RegExpExecArray;
        let str = tagsAsString;
        while (match = this.regTag.exec(str)) {
            str = match[2];
            tags.push(match[1]);
        }
        return tags;
    }

    private export(shortcuts: Shortcut[]): string {
        let result = "\x00shortcuts\x00";
        for (let i = 0; i < shortcuts.length; ++i) {
            let shortcut = shortcuts[i];
            result += "\x00" + i + "\x00";
            result += "\x01appname\x00" + shortcut.appname + "\x00";
            result += "\x01exe\x00" + shortcut.exe + "\x00";
            result += "\x01StartDir\x00" + shortcut.startDir + "\x00";
            result += "\x01icon\x00" + shortcut.icon + "\x00";
            result += "\x01ShortcutPath\x00" + shortcut.shortcutPath + "\x00";
            result += "\x01LaunchOptions\x00" + shortcut.launchOptions + "\x00";
            result += "\x02IsHidden\x00" + (shortcut.hidden ? "\x01" : "\x00") + "\x00\x00\x00";
            result += "\x00tags\x00";
            for (let i = 0; i < shortcut.tags.length; ++i) {
                result += "\x01" + i + "\x00" + shortcut.tags[i] + "\x00";
            }
            result += "\b\b";
        }
        result += "\b\b";
        return result;
    }

    private getAppId(exe: string, name: string): string {
        let inputString = exe + name;
        let crc = this.crc.compute(Buffer.from(inputString));
        let longVal = new long(crc);
        return longVal.or(0x80000000).shl(32).toUnsigned().or(0x02000000).toString();
    }
}

class Shortcut {
    public appname: string;
    public exe: string;
    public startDir: string;
    public icon: string;
    public shortcutPath: string;
    public hidden: boolean;
    public tags: string[];
    public favorite?: string;
    public launchOptions: string;
}

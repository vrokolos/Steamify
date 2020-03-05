import { Game } from "../game";
import * as fs from "fs";
import * as path from "path";
import { IExporter } from "./exporter_iface";
import { Shortcuter } from "./steam";
import * as ws from 'windows-shortcuts';
import { Utils } from "../utils";

export class Shield implements IExporter {
    ignored = "SteamLibrary";
    ignoreGames = ["Offspring Fling!", "Poker Night 2", "Cossacks: European Wars", "Rabbit Hole 3D: Steam Edition", "State of Decay 2"];
    forcedGames = ["Gears 5", "A Way Out"];
    public async sync(games: Game[], shieldConfig: string | string[]): Promise<void> {
        let fingerprint = path.join(process.env.LOCALAPPDATA, "NVIDIA", "NvBackend", "ApplicationOntology", "data", "fingerprint.db");
        let shortFolder = path.join(process.env.LOCALAPPDATA, "NVIDIA Corporation", "Shield Apps");

        let steam = new Shortcuter();
        let shortGames = await steam.import(shieldConfig as string);
        let steamGames = steam.steamLibraries.filter(p => p.indexOf(this.ignored) == -1).map(p => this.steamImport(p)).reduce((a, b) => a.concat(b));
        let nvidiaGames = this.import(fingerprint);
        let idxNvidiaIds = nvidiaGames.filter(p => p.appId != null && p.appId != "").groupBy(p => p.appId);
        let idxNvidiaNames = nvidiaGames.filter(p => p.name != null && p.name != "").groupBy(p => p.name.toLowerCase().replace(/ /gi, "").replace(/:/gi, "").replace(/’/gi, ""));

        let diffGames = steamGames.filter(p => this.ignoreGames.indexOf(p.name) == -1);
        //  ||
        // (this.ignoreGames.indexOf(p.name) == -1 && p.name.indexOf("VR") == -1 && !idxNvidiaIds.hasOwnProperty(p.appId) && !idxNvidiaNames.hasOwnProperty(p.name.toLowerCase().replace(/ /gi, "").replace(/:/gi, ""))));

        let shortapps = shortGames.map(p => ({ name: p.appname, appId: p.id, dir: p.startDir }));
        diffGames = diffGames.concat(shortapps.filter(p => this.ignoreGames.indexOf(p.name) == -1));
        //this.forcedGames.indexOf(p.name) != -1 ||
        // (this.ignoreGames.indexOf(p.name) == -1 && p.name.indexOf("VR") == -1 && !idxNvidiaNames.hasOwnProperty(p.name.toLowerCase().replace(/ /gi, "").replace(/:/gi, "")))));

        if (!fs.existsSync(path.join(shortFolder, "StreamingAssets"))) {
            fs.mkdirSync(path.join(shortFolder, "StreamingAssets"));
        }

        let existing = fs.readdirSync(shortFolder, { withFileTypes: true });
        for (let p of existing) {
            if (!p.isDirectory()) {
                fs.unlinkSync(path.join(shortFolder, p.name));
            }
        }
        let gamesAdded: string[] = [];
        for (let game of diffGames) {
            try {
                const friendlyName = game.name.replace(/:/g, '').replace(/’/gi, "");
                if (friendlyName.indexOf("Redistributable") != -1) {
                    continue;
                }
                if (!fs.existsSync(path.join(shortFolder, "StreamingAssets", friendlyName))) {
                    fs.mkdirSync(path.join(shortFolder, "StreamingAssets", friendlyName));
                }
                let boxArt = path.join(shortFolder, "StreamingAssets", friendlyName, "box-art.png");

                if (!fs.existsSync(boxArt)) {
                    let folder = "C:/Program Files (x86)/Steam/appcache/librarycache";
                    let poster = path.join(folder, `${game.appId}_library_600x900.jpg`);
                    if (!fs.existsSync(poster)) {
                        let newAppId = String(BigInt(game.appId) >> BigInt(32));
                        let folder2 = "C:/Program Files (x86)/Steam/userdata/35355223/config/grid";
                        poster = path.join(folder2, `${newAppId}p.jpg`);
                    }
                    if (!fs.existsSync(poster)) {
                        let res = await Utils.gist(game.name + " game poster");
                        let first = res.filter(p => (p.width / p.height) > 0.6 && (p.width / p.height) < 0.8)[0];
                        if (first != null) {
                            await Utils.downloadFile(first.url, boxArt);
                        } else {
                            fs.copyFileSync("c:/Temp/box-art.png", boxArt);
                        }
                    } else {
                        fs.copyFileSync(poster, boxArt);
                    }
                }
                let lnk = path.join(shortFolder, friendlyName + ".lnk");
                if (fs.existsSync(lnk)) {
                    fs.unlinkSync(lnk);
                }
                ws.create(lnk, { target: "C:\\Program Files (x86)\\Steam\\Steam.exe", args: "steam://rungameid/" + game.appId, hotkey: 0, runStyle: 1 });
                gamesAdded.push(friendlyName + ".lnk");
            } catch (ex) {
                console.log(game.name + " " + ex.message);
            }
        }
        /*
                let uwpapps = cstLnk.getLinks(["c:\\Games\\Win"]);
                for (let uwpApp of uwpapps) {
                    let friendlyName = path.basename(uwpApp, path.extname(uwpApp));
                    try {
                        if (!fs.existsSync(path.join(shortFolder, "StreamingAssets", friendlyName))) {
                            fs.mkdirSync(path.join(shortFolder, "StreamingAssets", friendlyName));
                        }
                        let boxArt = path.join(shortFolder, "StreamingAssets", friendlyName, "box-art.png");
                        if (!fs.existsSync(boxArt)) {
                            let res = await Utils.gist(friendlyName + " game poster");
                            let first = res.filter(p => (p.width / p.height) > 0.6 && (p.width / p.height) < 0.8)[0];
                            if (first != null) {
                                await Utils.downloadFile(first.url, boxArt);
                            } else {
                                fs.copyFileSync("c:/Temp/box-art.png", boxArt);
                            }
                        }
                        let lnk = path.join(shortFolder, friendlyName + ".lnk");
                        gamesAdded.push(friendlyName + ".lnk");
                        fs.copyFileSync(uwpApp, lnk);
                    } catch (ex) {
                        console.log(friendlyName + " " + ex.message);
                    }
                }
        */
    }

    private import(nvidiaFolder: string): { name: string, appId: string, dir: string }[] {
        let res: { name: string, appId: string, dir: string }[] = [];

        let js = fs.readFileSync(nvidiaFolder, "utf8");
        let reId = /steam:\/\/rungameid\/(\d*)/gi;
        let reName = /<DisplayName>(.*?)<\/DisplayName>/gi;
        let match: RegExpExecArray | string[];
        while (match = reName.exec(js)) {
            res.push({ name: match[1], appId: '', dir: '' });
        }
        while (match = reId.exec(js)) {
            res.push({ name: '', appId: match[1], dir: '' });
        }
        return res;
    }

    private steamImport(steamFolder: string): { name: string, appId: string, dir: string }[] {
        let res: { name: string, appId: string, dir: string }[] = [];
        let realSteamFolder = path.join(steamFolder, "steamapps");
        let packages = fs.readdirSync(realSteamFolder).filter(p => p.endsWith(".acf"));
        for (let pack of packages) {
            let str = fs.readFileSync(path.join(realSteamFolder, pack), { encoding: "utf8" });
            let app = /\"appid\"\s*?\"(\d*)\"/gi.exec(str);
            if (app == null) { continue; }
            let appId = app[1];
            let name = /\"name\"\s*?\"(.*)\"/gi.exec(str)[1];
            let dir = /\"installdir\"\s*?\"(.*)\"/gi.exec(str)[1];
            res.push({ name, appId, dir });
        }
        return res;
    }
}
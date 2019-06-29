import { Game } from "../game";
import * as fs from "fs";
import * as path from "path";
import { IExporter } from "./exporter_iface";
import { Shortcuter } from "./steam";
import * as ws from 'windows-shortcuts';
import { Utils } from "../utils";

export class Shield implements IExporter {
    public async sync(games: Game[], shieldConfig: string | string[]): Promise<void> {
        let fingerprint = shieldConfig[0];
        let shortFolder = shieldConfig[1];
        let steamFolder = shieldConfig[2];
        let steamShortcutFolder = shieldConfig[3];

        let steamGames = this.steamImport(steamFolder);
        let nvidiaGames = this.import(fingerprint);
        let idxNvidiaIds = nvidiaGames.filter(p => p.appId != null && p.appId != "").groupBy(p => p.appId);
        let idxNvidiaNames = nvidiaGames.filter(p => p.name != null && p.name != "").groupBy(p => p.name.toLowerCase().replace(/ /gi, "").replace(/:/gi, ""));

        let steam = new Shortcuter();
        let shortcutFile = path.join(steamShortcutFolder, "shortcuts.vdf");
        let rs = fs.readFileSync(shortcutFile, "utf8");
        let shortGames = steam.import(rs);
        let diffGames = steamGames.filter(p => p.name.indexOf("VR") == -1 && !idxNvidiaIds.hasOwnProperty(p.appId) && !idxNvidiaNames.hasOwnProperty(p.name.toLowerCase().replace(/ /gi, "").replace(/:/gi, "")));

        let shortapps = shortGames.map(p => { return { name: p.appname, appId: p.id, dir: p.startDir }; });
        diffGames = diffGames.concat(shortapps.filter(p => p.name.indexOf("VR") == -1 && !idxNvidiaNames.hasOwnProperty(p.name.toLowerCase().replace(/ /gi, "").replace(/:/gi, ""))));

        if (!fs.existsSync(path.join(shortFolder, "StreamingAssets"))) {
            fs.mkdirSync(path.join(shortFolder, "StreamingAssets"));
        }

        for (let game of diffGames) {
            try {
                const friendlyName = game.name.replace(/:/g, '');
                if (!fs.existsSync(path.join(shortFolder, "StreamingAssets", friendlyName))) {
                    fs.mkdirSync(path.join(shortFolder, "StreamingAssets", friendlyName));
                }
                let boxArt = path.join(shortFolder, "StreamingAssets", friendlyName, "box-art.png");
                if (!fs.existsSync(boxArt)) {
                    let res = await Utils.gist(game.name + " game poster");
                    let first = res.filter(p => (p.width / p.height) > 0.60 && (p.width / p.height) < 0.80)[0];
                    if (first != null) {
                        await Utils.downloadFile(first.url, boxArt);
                    } else {
                        fs.copyFileSync("c:/Temp/box-art.png", boxArt);
                    }
                }
                let lnk = path.join(shortFolder, friendlyName + ".lnk");
                if (fs.existsSync(lnk)) {
                    fs.unlinkSync(lnk);
                }
                ws.create(lnk, { target: "C:\\Program Files (x86)\\Steam\\Steam.exe", args: "steam://rungameid/" + game.appId, hotkey: 0, runStyle: 1 });
            } catch (ex) {
                console.log(game.name + " " + ex.message);
            }
        }
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
            let appId = /\"appid\"\s*?\"(\d*)\"/gi.exec(str)[1];
            let name = /\"name\"\s*?\"(.*)\"/gi.exec(str)[1];
            let dir = /\"installdir\"\s*?\"(.*)\"/gi.exec(str)[1];
            res.push({ name, appId, dir })
        }
        return res;
    }
}
import { Game } from "../game";
import { IImporter } from "./importer_iface";
//import * as fs from "fs";
//import * as path from "path";
import { Utils } from "../utils";
//import klaw = require("klaw-sync");
import * as path from "path";
import * as fs from "fs";
const { readdir } = require('fs').promises;

async function getFiles(dir): Promise<string[]> {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

export class Win implements IImporter {
    public getSize(file: string): number {
        try {
            return fs.statSync(file).size;
        } catch {
            return 0;
        }
    }

    public async getInstalledGames(conf: string | string[]): Promise<Game[]> {
        let games: Game[] = [];
        let libPaths = Array.isArray(conf) ? conf : [conf];
        let regKey = "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages";
        let installsKey = await Utils.GetReg(regKey);
        if (installsKey != null && installsKey.keys != null) {
            for (let install of installsKey.keys) {
                try {
                    let gameData = await Utils.GetReg(regKey + "\\" + install);
                    let folder: string = gameData.values["PackageRootFolder"].value;
                    let id: string = gameData.values["PackageID"].value;
                    let name: string = gameData.values["DisplayName"].value;
                    if (!name.startsWith("@") &&
                        !name.startsWith("Microsoft") && !name.startsWith("DirectX") && !name.startsWith("Xbox")
                        && !name.startsWith("PinningConf") && !name.startsWith("Capture") && name.indexOf("Realtek") == -1 && name.indexOf("EdgeDevtoolsPlugin") == -1
                        && !name.startsWith("OneDrive") && !name.startsWith("Ελληνικά") && !name.startsWith("Shell Input")) {
                        let files = await getFiles(folder);
                        let exeFiles = files.filter(p => p.toUpperCase().indexOf(".EXE") > -1);
                        let pngFiles = files.filter(p => p.toUpperCase().indexOf("PNG") > -1);
                        let icon = pngFiles[0];
                        let theId = id.replace(/_.*?__/, '_');
                        let manPath = path.join(folder, "AppxManifest.xml");
                        let appId = "App";
                        if (fs.existsSync(manPath)) {
                            let manifest = fs.readFileSync(manPath, "utf8");
                            let newAppId = /Application\ Id="(.*?)"/g.exec(manifest);
                            if (newAppId != null) {
                                appId = newAppId[1];
                            }
                            let png = /<Logo>(.*?)<\/Logo>/g.exec(manifest);
                            if (png != null) {
                                icon = path.join(folder, png[1]);
                            }
                        }
                        if (name.startsWith("ms-resource")) {
                            name = appId;
                        }
                        theId += "!" + appId;
                        /*let opts: klaw.Options = { nodir: true, filter: file => file.path.toUpperCase().indexOf(".EXE") > -1 };
                        (<any>opts).traverseAll = true;
                        const exeFiles = klaw(folder, opts).slice(0);*/
                        if (exeFiles.length == 0) {
                            continue;
                        }
                        let theFile = '';
                        if (exeFiles.length == 1) {
                            theFile = exeFiles[0];
                        } else if (exeFiles.length > 1) {
                            let properName = name.replace(/\s/, '').toUpperCase();
                            for (let exeFile of exeFiles) {
                                if (path.basename(exeFile).toUpperCase().replace(".EXE", "").indexOf(properName) > -1
                                    ||
                                    properName.indexOf(path.basename(exeFile).toUpperCase().replace(".EXE", "")) > -1
                                ) {
                                    theFile = exeFile;
                                    break;
                                }
                            }
                        }
                        if (theFile == '') {
                            theFile = exeFiles.map(p => ({ file: p, length: this.getSize(p) })).sort((a, b) => a.length - b.length)[0].file;
                            console.log(exeFiles);
                        }
                        icon = icon || theFile;
                        let newGame = {
                            icon: icon,
                            tile: '',
                            poster: '',
                            name: name.replace(/:/, '').replace(/\./, '').replace(/’/gi, ""),
                            //exec: "c:\\Users\\iosif\\OneDrive\\Scripts\\runandwait.exe\" \"" + pack + "\" \"" + exe + "",
                            exec: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                            args: `-windowstyle hidden "c:\\Users\\iosif\\OneDrive\\Scripts\\game.run.ps1" "${theId}" "${path.basename(theFile)}"`,
                            folder: "",
                            workFolder: "C:\\",
                            tag: "WIN"
                        } as Game;
                        games.push(newGame);
                    }
                } catch (ex) {
                    console.log(`error :`, ex);
                }
            }
        }
        /*
        let links = this.getLinks(libPaths);
        for (let link of links) {
            ws.query(link, console.log);
            let content = fs.readFileSync(link);
            let b = Array.from(content);
            let s = b.map(ps => ps.toString(16).padStart(2, '0').toUpperCase());
            let pack = this.getPackageFromLnk(s.join(" "));
            let exe = this.getExeFromLnk(s.join(" "));
            let gameName = path.basename(link, path.extname(link));
            let gameIcon = "";
            let steamId = await Utils.steamsearch(gameName);
            let tile = '';
            let poster = '';
            if (steamId != null) {
                tile = `http://cdn.akamai.steamstatic.com/steam/apps/${steamId.toString()}/header.jpg`;
                poster = `http://cdn.akamai.steamstatic.com/steam/apps/${steamId.toString()}/library_600x900.jpg`;
            }
            //console.log(pack);
            let newGame = {
                icon: gameIcon,
                tile: tile,
                poster: poster,
                name: gameName,
                //exec: "c:\\Users\\iosif\\OneDrive\\Scripts\\runandwait.exe\" \"" + pack + "\" \"" + exe + "",
                exec: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                args: `-windowstyle hidden "c:\\Users\\iosif\\OneDrive\\Scripts\\game.run.ps1" "${pack}" "${exe}"`,
                folder: "",
                workFolder: "C:\\",
                tag: "WIN"
            } as Game;
            games.push(newGame);
        }
        */

        Utils.logImport("WIN", libPaths.join(" "), games);
        return games;
    }
}
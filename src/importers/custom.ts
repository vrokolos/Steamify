import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import klaw = require("klaw-sync");
import { Gog } from "./gog";

export class Custom implements IImporter {
    public async getInstalledGames(libPath: string): Promise<Game[]> {
        let o = new Gog();
        let games: Game[] = [];

        if (fs.existsSync(libPath)) {
            let dirs = fs.readdirSync(libPath);
            for (let dir of dirs) {
                let folder = path.join(libPath, dir);
                let isDir = fs.lstatSync(folder).isDirectory();
                if (!isDir) {
                    continue;
                }
                let steamId = this.getSteamAppId(folder);
                if (steamId != null) {
                    let newGame = {
                        icon: '',
                        tile: steamId.tile,
                        name: dir,
                        exec: steamId.exe.replace(folder + '\\', "").replace(folder, ""),
                        args: steamId.args,
                        folder: folder, //path.dirname(pac.path),
                        workFolder: '',
                        tag: "WAREZ",
                        fixTile: false
                    };
                    console.log(newGame);
                    games.push(newGame);
                } else {
                    let ame = (await o.getInstalledGames(folder))[0];
                    if (ame != null) {
                        console.log(ame);
                        games.push(ame);
                    } else {
                        console.log("Game not found: " + dir);
                    }
                }
                /*
                let opts: klaw.Options = { nodir: true, filter: file => file.path.toUpperCase().indexOf("SMARTSTEAMEMU.INI") > -1 };
                (<any>opts).traverseAll = true;
                const packages = klaw(libPath, opts);
                for (let pac of packages) {
                    try {
                        let obj = JSON.parse(fs.readFileSync(pac.path, "utf8"));
                        let playTask = obj.playTasks.find(p => p.category == "game");
                        let apiFetch = await fetch(`https://api.gog.com/products/${obj.gameId}`);
                        let api = await apiFetch.json();
                        let newGame = {
                            icon: 'http:' + api.images.icon,
                            tile: 'http:' + api.images.logo2x.replace("glx_logo_2x", "ggvgm"),
                            name: obj.name,
                            exec: playTask.path,
                            args: playTask.arguments || '',
                            folder: path.dirname(pac.path),
                            workFolder: playTask.workingDir || '',
                            tag: "GOG"
                        };
                        games.push(newGame);
                    } catch (e) {
                        console.log(`Failed to import installed GOG game ${pac}.`);
                    }
                }
                */
            }
        }
        return games;
    }

    private getSteamAppId(dir: string): { tile: string, exe: string, args: string } {
        let opts: klaw.Options = {
            nodir: true, filter: file => file.path.toUpperCase().indexOf(".INI") > -1 || file.path.indexOf("appid") > -1 ||
                (file.path.toUpperCase().indexOf(".EXE") > -1 && file.path.indexOf("unins") == -1 && file.path.toUpperCase().indexOf("REDIST") == -1 && file.path.toUpperCase().indexOf("THIRDPARTY") == -1)
        };
        (<any>opts).traverseAll = true;
        const allfiles = klaw(dir, opts).slice(0);
        let isOrigin = allfiles.find(p => p.path.toUpperCase().indexOf("ORIGINS.INI") > -1);
        let packages = allfiles.filter(p => p.path.toUpperCase().indexOf(".EXE") == -1);
        let filtexes = allfiles.filter(p => p.path.toUpperCase().indexOf(".EXE") > -1);
        let appid = null;
        let target = null;
        let theargs = '';
        if (isOrigin != null) {
            let txt = fs.readFileSync(isOrigin.path, "utf8");
            let tilePath = '';
            if (fs.existsSync(path.join(dir, "folder.png"))) {
                tilePath = path.join(dir, "folder.png");
            } else if (fs.existsSync(path.join(dir, "folder.jpg"))) {
                tilePath = path.join(dir, "folder.jpg");
            }
            let match = /exe\s*=\s*\"\\(.*?)\"/gi.exec(txt);
            let theex = path.join(path.dirname(isOrigin.path), match[1]);
            if (fs.existsSync(theex)) {
                return { tile: tilePath, exe: theex, args: '' };
            }
            return null;
        }
        for (let pac of packages) {
            let txt = fs.readFileSync(pac.path, "utf8");
            let match = /appid\s*=\s*(\d*)/gi.exec(txt);
            if (match != null && match.length > 1) {
                appid = match[1];
                break;
            }
            if (pac.path.indexOf("appid") > -1) {
                let match = /.*?(\d\d*)/gi.exec(txt);
                appid = match[1];
                break;
            }
        }
        if (appid == null || appid == "") {
            //console.log("appid not found: " + dir);
            return null;
        }

        for (let pac of packages) {
            let txt = fs.readFileSync(pac.path, "utf8");
            let exematch = /target\s*=\s*(.*\.exe)/gi.exec(txt);
            if (exematch != null && exematch.length > 1) {
                let targetExe = path.join(path.dirname(pac.path), exematch[1]);
                if (fs.existsSync(targetExe)) {
                    target = targetExe;
                    break;
                } else {
                    let matches = filtexes.filter(p => p.path.indexOf(exematch[1]) > 1);
                    target = matches[0] || null;
                    if (target != null) {
                        break;
                    }
                }
            }
        }
        for (let pac of packages) {
            let txt = fs.readFileSync(pac.path, "utf8");
            let armatch = /args\s*=\s*(.*)/gi.exec(txt);
            if (armatch != null && armatch.length > 1) {
                theargs = armatch[1];
            }
        }

        let theexe = null;
        if (target != null) {
            theexe = target;
        }
        if (theexe == null) {
            if (filtexes.length == 1) {
                theexe = filtexes[0].path;
            } else {
                for (let exe of filtexes) {
                    let exeName = path.basename(exe.path).toUpperCase().replace(/\s/g, "").replace(".EXE", "");
                    let dirName = path.basename(dir).toUpperCase().replace(/\s/g, "");
                    if (exeName.indexOf(dirName) > -1) {
                        theexe = exe.path;
                        break;
                    }
                }
                if (theexe == null) {
                    for (let exe of filtexes) {
                        let exeName = path.basename(exe.path).toUpperCase().replace(/\s/g, "").replace(".EXE", "");
                        let dirName = path.basename(dir).toUpperCase().replace(/\s/g, "");
                        if (dirName.indexOf(exeName) > -1) {
                            theexe = exe.path;
                            break;
                        }
                    }
                }
            }
        }
        if (theexe != null) {
            return { tile: `http://cdn.akamai.steamstatic.com/steam/apps/${parseInt(appid).toString()}/header.jpg`, exe: theexe, args: theargs };
        }
        console.log("Exe not found: " + dir + " " + filtexes.map(p => p.path).join(" "));

    }
}
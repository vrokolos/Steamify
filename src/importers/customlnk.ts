import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import { Utils } from "../utils";
import * as ws from 'windows-shortcuts';
//import { resolve } from "dns";

export class CustomLnk implements IImporter {
    //    private async readShortcut(path: string): Promise<any> {
    //     return new Promise<any>((res, rej) => ws.query(path, (e, o) => res(o)));
    // }

    public getLinks(libPaths: string | string[]): string[] {
        let result: string[] = [];
        for (let libPath of libPaths) {
            if (fs.existsSync(libPath)) {
                let dirs = fs.readdirSync(libPath);
                for (let dir of dirs) {
                    let file = path.join(libPath, dir);
                    let stat = fs.lstatSync(file);
                    if (!(path.extname(file) === ".lnk" && stat.isFile())) {
                        continue;
                    }
                    result.push(file);
                    //let short = await this.readShortcut(file);
                    //console.log({ file, short });
                }
            }
        }
        return result;
    }

    buf2hex(buffer) { // buffer is an ArrayBuffer
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    getPackageFromLnk(str) {
        let result = [];
        let match = /05.00.00.00.00.1F.00.00(.*?)0F/.exec(str)[1];
        if (match != null) {
            let array = match.substring(16).replace(/00/g, '","');
            array = array.substring(0, array.indexOf('"," "," ","') - 1);
            result = JSON.parse('["' + array + '"]').map(p => parseInt(p.trim(), 16)).map(s => String.fromCharCode(s)).join("");
        }
        return result;
    }

    getExeFromLnk(str) {
        let result = "";
        let matches = /[0\s]{20,}(?:0[^\s0]|[^0\s]0|[^0\s][^0\s]).00\s((?:0[^\s0]|[^0\s]0|[^0\s][^0\s])(?:.*?))\s00\s00\s00/g.exec(str);
        if (matches != null) {
            let match = matches[1];
            let array = match.replace(/00/g, '","');
            result = JSON.parse('["' + array + '"]').map(p => parseInt(p.trim(), 16)).map(s => String.fromCharCode(s)).join("");
        }
        return result;
    }

    public async getInstalledGames(conf: string | string[]): Promise<Game[]> {
        let games: Game[] = [];
        let libPaths = Array.isArray(conf) ? conf : [conf];
        let links = this.getLinks(libPaths);
        for (let link of links) {
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
        Utils.logImport("CUSTOMLNK", libPaths.join(" "), games);
        return games;
    }
}
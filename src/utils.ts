import regedit = require('regedit');
import * as xml2js from "xml2js";
import * as fs from "fs";
import * as path from "path";
import * as gis from "g-i-s";
import fetch from "node-fetch";
import { Game } from './game';

declare global { interface Array<T> { groupBy(x: (p: T) => string): { [key: string]: Array<T>; } } }
Array.prototype.groupBy = function (x: (p: any) => string) {
    return this.reduce((groups: { [x: string]: any[]; }, item: { [x: string]: any; }) => {
        const val = x(item);
        groups[val] = groups[val] || [];
        groups[val].push(item);
        return groups;
    }, {});
}
export namespace Utils {
    let list: { [name: string]: number } = null;

    export async function gist(text: string): Promise<{ url: string, width: number, height: number }[]> {
        return new Promise<{ url: string, width: number, height: number }[]>((r, e) => gis(text, (err: any, results: any) => err ? e(err) : r(results)));
    }

    export async function downloadFile(url: string, path: string) {
        const res = await fetch(url);
        const fileStream = fs.createWriteStream(path);
        await new Promise((resolve, reject) => {
            (<any>res.body).pipe(fileStream);
            (<any>res.body).on("error", err => reject(err));
            fileStream.on("finish", () => resolve());
        });
    }

    export async function GetReg(key: string): Promise<any> {
        return new Promise((r, f) => {
            regedit.arch.list(key, ((err, subKey) => {
                if (err || (subKey[key].values == undefined && subKey[key].keys == undefined)) {
                    regedit.arch.list32(key, ((err, subKey) => err ? f(err) : r(subKey[key])));
                } else {
                    r(subKey[key]);
                }
            }));
        });
    }

    export async function GetRegString(thepath: string): Promise<string> {
        let folder = path.dirname(thepath);
        let val = path.basename(thepath);
        let key = await GetReg(folder);
        let value = key.values[val].value as string;
        return value;
    }

    export async function xml2json(data: string): Promise<any> {
        return new Promise<any>((resolve, fail) => xml2js.parseString(data, (err, project: any) => err ? fail(err) : resolve(project)));
    }

    export function logImport(platform: string, libPath: string, games: Game[]) {
        let logGames = games.length == 0 ? "No games installed" : games.map(p => p.name).join(", ");
        console.log(`[${platform}] ${libPath} | ${logGames}`);
    }

    // GAMELIST: http://api.steampowered.com/ISteamApps/GetAppList/v0001/
    export function init(): void {
        list = {};
        let thelist = JSON.parse(fs.readFileSync("./assets/steamGames.json", "utf8")).applist.apps.app;
        for (let app of thelist) {
            list[(app.name as string).toLowerCase()] = app.appid;
        }
    }

    export async function steamsearch(name: string): Promise<number> {
        return list[name.toLowerCase()] || null;
    }
}
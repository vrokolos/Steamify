import regedit = require('regedit');
import * as xml2js from "xml2js";
import * as fs from "fs";

export namespace Utils {
    export async function GetReg(key: string): Promise<any> {
        return new Promise((r, f) => {
            regedit.arch.list(key, ((err, subKey) => {
                if (err || (subKey[key].values == undefined && subKey[key].keys == undefined)) {
                    regedit.arch.list32(key, ((err, subKey) => {
                        if (err) {
                            f(err);
                        } else {
                            r(subKey[key]);
                        }
                    }));
                } else {
                    r(subKey[key]);
                }
            }));
        });
    }

    export async function xml2json(data: string): Promise<any> {
        let ss = new Promise<any>((resolve, fail) => {
            xml2js.parseString(data, (err, project: any) => {
                if (err) {
                    fail(err);
                } else {
                    resolve(project);
                }
            });
        });
        return ss;
    }

    let list: { [name: string]: number } = null;
    // GAMELIST: http://api.steampowered.com/ISteamApps/GetAppList/v0001/
    export async function steamsearch(name: string): Promise<any> {
        if (list == null) {
            list = {};
            let thelist = JSON.parse(fs.readFileSync("./assets/steamGames.json", "utf8")).applist.apps.app;
            for (let app of thelist) {
                list[app.name] = app.appid;
            }
        }
        if (list.hasOwnProperty(name)) {
            return list[name];
        }
        return null;
    }
}
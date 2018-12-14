import regedit = require('regedit');
import * as xml2js from "xml2js";

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
}
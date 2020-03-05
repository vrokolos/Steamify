import { Game } from "./game";
import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import * as gm from "gm";

import { MassImporter } from "./importers/massimporter";
import { MassExporter } from "./exporters/massexporter";
import { Utils } from "./utils";
import { Shield } from "./exporters/shield";
//import { Shield } from "./exporters/shield";
export class Converter {
    static async go() {
        Utils.init();
        let importer = new MassImporter();
        let converter = new Converter();
        let exporter = new MassExporter();

        let config = fs.readFileSync("./config.json", "utf8");
        let games = await importer.getInstalledGames(config);
        games = await converter.fix(games);
        await exporter.sync(games, config);
    }

    static async test() {
        let exporter = new Shield();
        let config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
        exporter.sync(null, config.Steam);

        //console.log(folders);
    }

    aspect(p: any) {
        return Math.abs((p.height / p.width) - 1.5);
    }

    private async testurl(url: string): Promise<boolean> {
        let req = await fetch(url);
        let text = await req.text();
        if (text.indexOf("html") > -1 || text.indexOf("found") > -1 || text.indexOf("Found") > -1 || text.indexOf("Error") > -1) {
            return false;
        }
        return true;
    }

    public async fix(games: Game[]): Promise<Game[]> {
        if (!fs.existsSync("./out")) {
            fs.mkdirSync("./out");
        }
        if (!fs.existsSync("./out/pics")) {
            fs.mkdirSync("./out/pics");
        }

        for (let game of games) {
            try {

                let gameExe = game.exec;
                if (gameExe.indexOf("://") == -1) {
                    gameExe = "\"" + path.join(game.folder, game.exec).replace("/", "\\\\").replace(/\\$/g, '') + "\"" + (game.args == "" ? "" : (" " + game.args));
                }

                let gameDir = "\"" + path.join(game.folder, game.workFolder || '').replace("/", "\\\\").replace(/\\$/g, '') + "\\\"";
                let appId = game.name;
                let steamTileFolder = "./out/pics";
                let tileFile = path.join(steamTileFolder, appId + ".jpg");
                if (!fs.existsSync(tileFile)) {
                    if (game.tile == '' || game.tile == null) {
                        const gameName = game.name;
                        let rest = "";
                        for (let url of ["\"" + gameName + "\" imagesize:460x215", "\"" + gameName + "\""]) {
                            let res = await Utils.gist(url);
                            let hqtiles = res.filter(p => p.height == 430 && p.width == 920);
                            for (let first of hqtiles) {
                                if (await this.testurl(first.url)) {
                                    rest = first.url;
                                    break;
                                }
                            }
                            if (rest == "") {
                                let sqtiles = res.filter(p => p.height == 215 && p.width == 460);
                                for (let first of sqtiles) {
                                    if (await this.testurl(first.url)) {
                                        rest = first.url;
                                        break;
                                    }
                                }
                            }
                            if (rest == "") {
                                let othertiles = res.filter(p => p.height < p.width * 0.7);
                                for (let first of othertiles) {
                                    if (await this.testurl(first.url)) {
                                        rest = first.url;
                                    }
                                }
                            }
                            if (rest != "") {
                                break;
                            }
                        }

                        game.tile = rest;
                    }
                    if (game.tile != '' && game.tile != null) {
                        /*if (game.fixTile) {
                            await this.portraitToTile(game.tile, tileFile);
                        } else*/ if (game.tile.startsWith("http")) {
                            let req = await fetch(game.tile);
                            let buff = await req.buffer();
                            fs.writeFileSync(tileFile, buff);
                        } else if (!fs.existsSync(tileFile)) {
                            fs.copyFileSync(game.tile, tileFile);
                        }
                    }/* else if (game.poster != '' && game.poster != null) {
                        await this.portraitToTile(game.poster, tileFile);
                    }*/ else {
                        tileFile = "";
                    }
                }

                let posterFile = path.join(steamTileFolder, appId + "p.jpg");
                if (!fs.existsSync(posterFile)) {
                    let gamePoster = game.poster;
                    if (gamePoster != '') {
                        try {
                            if (await this.testurl(gamePoster)) {
                                let req = await fetch(gamePoster);
                                await req.buffer();
                            } else {
                                gamePoster = "";
                            }
                        } catch (e) {
                            gamePoster = '';
                        }
                    }
                    if (gamePoster == '' || gamePoster == null || gamePoster == undefined) {
                        let res = await Utils.gist("\"" + game.name + "\" game poster");
                        let posters = res.filter(p => p.height > p.width * 1.4);
                        for (let first of posters) {
                            if (await this.testurl(first.url)) {
                                gamePoster = first.url;
                                break;
                            }
                        }
                    }
                    if (gamePoster != '' && gamePoster != null) {
                        /*if (game.fixTile) {
                            await this.portraitToTile(game.tile, tileFile);
                        } else*/ if (gamePoster.startsWith("http")) {
                            let req = await fetch(gamePoster);
                            let buff = await req.buffer();
                            fs.writeFileSync(posterFile, buff);
                        } else if (!fs.existsSync(posterFile)) {
                            fs.copyFileSync(gamePoster, posterFile);
                        }
                    }/* else if (game.poster != '' && game.poster != null) {
                        await this.portraitToTile(game.poster, tileFile);
                    }*/ else {
                        posterFile = "";
                    }
                }

                let theIcon = null;
                let iconFile = path.join(steamTileFolder, appId + "ico.png");
                if (game.icon != '' && game.icon != null && game.icon.startsWith("http")) {
                    let tileFetch = await fetch(game.icon);
                    let buff = await tileFetch.buffer();
                    fs.writeFileSync(iconFile, buff);
                    theIcon = iconFile;
                } else if (game.icon.endsWith(".exe") || game.icon.endsWith(".exe\"") || game.icon.endsWith(".png")) {
                    theIcon = game.icon;
                } else if (gameExe.endsWith(".exe") || gameExe.endsWith(".exe\"")) {
                    theIcon = gameExe;
                } else {
                    fs.copyFileSync("./assets/generic.png", iconFile);
                    theIcon = iconFile;
                }
                game.icon = theIcon;
                game.tile = tileFile;
                game.poster = posterFile;
                game.exec = gameExe;
                game.workFolder = gameDir;
            } catch (e) {
                console.log(e, "Error on game", game);
            }
        }
        return games;
    }

    private async portraitToTile(url: string = '', outfile: string = '') {
        let buff: Buffer = null;
        if (url.startsWith("http")) {
            let req = await fetch(url);
            buff = await req.buffer();
        } else {
            buff = fs.readFileSync(url);
        }

        let s = gm(buff).resize(460, 215, '!').blur(20, 20);
        await this.gmWrite(s, "./out/tempback.png");

        let r = gm(buff).resize(460, 215);
        await this.gmWrite(r, "./out/tempin.png");

        let f = gm(null).command("composite").in("-gravity", "center").in("./out/tempin.png").in("./out/tempback.png");
        await this.gmWrite(f, outfile);
    }

    private async gmWrite(theGm: gm.State, file: string): Promise<void> {
        return new Promise<void>((r, f) => theGm.write(file, (err) => { if (err) { f(err); } else { r(); } }));
    }
}
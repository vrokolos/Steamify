import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import klaw = require("klaw-sync");
import { Utils } from "../utils";

export class Bnet implements IImporter {
    public async getInstalledGames(): Promise<Game[]> {
        let games: Game[] = [];

        let p = path.join(process.env.APPDATA, "Battle.Net", "Battle.net.config");
        let conf = fs.readFileSync(p, "utf8");
        let config = JSON.parse(conf);
        let libPath = config.Client.Install.DefaultInstallPath;
        let opts: klaw.Options = { nodir: true, depthLimit: 1, filter: file => file.path.indexOf(".product.db") > -1 };
        (<any>opts).traverseAll = true;
        const packages = klaw(libPath, opts);
        for (let relPac of packages) {
            let pac = relPac.path;
            try {
                let obj = fs.readFileSync(pac, "utf8");
                let secondLine = obj.split("\n")[1];
                let product = bNetGames.find(g => secondLine.indexOf(g.internalId) > -1);
                if (product == null) {
                    continue;
                }

                let game = new Game();
                game.tag = "Battle.net";
                game.name = product.name;
                game.workFolder = "";
                game.exec = `battlenet://${product.productId}/`;
                game.folder = path.dirname(pac);
                game.icon = product.iconUrl;
                game.tile = product.coverUrl;
                games.push(game);
            } catch (e) {
                console.log(`Failed to import installed battlenet game ${pac}.`);
            }
        }
        Utils.logImport("BNET", libPath, games);
        return games;
    }
}

const enum BNetAppType {
    Default,
    Classic
}

class BNetApp {
    public productId: string;
    public internalId: string;
    public iconUrl: string;
    public backgroundUrl: string;
    public coverUrl: string;
    public name: string;
    public type: BNetAppType;
    public classicExecutable?: string;
    public apiId?: number;
}

let bNetGames: BNetApp[] = [
    {
        apiId: 5730135,
        productId: "WoW",
        internalId: "wow",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-wow-3dd2cfe06df74407.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fe4/e09d3a01538f92686e2d7e30dc89ee1e-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//fab/a25ed0ddd3225929bc3ad5139ebc7483-prod-card-tall.jpg",
        name: "World of Warcraft",
        type: BNetAppType.Default
    },
    {
        apiId: 17459,
        productId: "D3",
        internalId: "diablo3",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-d3-ab08e4045fed09ee.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fad/6a06a79f8b1134a80d794dc24c9cd2d1-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//fbd/bafaafcfb7c6c620067662a04409ba66-prod-card-tall.jpg",
        name: "Diablo III",
        type: BNetAppType.Default
    },
    {
        apiId: 21298,
        productId: "S2",
        internalId: "s2",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-sc2-6e33583ba0547b6a.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fcd/ab0419d498190f5f2ccf69414265b70b-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//fd8/18fb5862b6d5aea418ad4102ed48aa63-prod-card-tall.jpg",
        name: "StarCraft II",
        type: BNetAppType.Default
    },
    {
        apiId: 21297,
        productId: "S1",
        internalId: "s1",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-scr-fef4f892c20f584c.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fb2/eb1b3feb5cc03da2d05f3e9e88aaec2a-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//f95/6d9453be1750dbf035f0ee574cff2c25-prod-card-tall.jpg",
        name: "StarCraft",
        type: BNetAppType.Default
    },
    {
        apiId: 1465140039,
        productId: "WTCG",
        internalId: "hs_beta",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-hs-beb1a37bc84beefb.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fac/895ca992a21d9c960bd30f9738d7bfb8-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//f89/c074270c5024a5bb627d46cddf024dad-prod-card-tall.jpg",
        name: "Hearthstone",
        type: BNetAppType.Default
    },
    {
        apiId: 1214607983,
        productId: "Hero",
        internalId: "heroes",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-heroes-78cae505b7a524fb.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//f88/9eaac80f3496502843198b092eb35b84-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//f8c/0f2efeb8d64127edb647a95c236c92ba-prod-card-tall.jpg",
        name: "Heroes of the Storm",
        type: BNetAppType.Default
    },
    {
        apiId: 5272175,
        productId: "Pro",
        internalId: "prometheus",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-ow-1dd54d69712651a9.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fc3/e21df4ac2fd75cd9884a55744a1786c3-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//4c/c358d897f1348281ed0b21ea2027059b-prod-card-tall.jpg",
        name: "Overwatch",
        type: BNetAppType.Default
    },
    {
        apiId: 1146311730,
        productId: "DST2",
        internalId: "destiny2",
        iconUrl: "https://blznav.akamaized.net/img/games/logo-dest2-933dcf397eb647e0.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//fbd/22512bcb91e4a3b3d9ee208be2ee3beb-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//f84/7d453e354c9df8ca335ad45da020704c-prod-card-tall.jpg",
        name: "Destiny 2",
        type: BNetAppType.Default
    },
    {
        apiId: 1447645266,
        productId: "VIPR",
        internalId: "viper",
        iconUrl: "https://bneteu-a.akamaihd.net/account/static/images/dashboard/callOfDutyBlackOps4/A8E38BEC-B3F0-4C46-A870-D377FC6602DC/logo-32.4a1nD.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//5d/411c53766cdf6155fcc952f79f304b4a-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//62/a346ee691a8d0829c5a895200dd17cbf-prod-card-tall-v2.jpg",
        name: "Call of Duty: Black Ops 4",
        type: BNetAppType.Default
    },
    {
        productId: "D2",
        internalId: "Diablo II",
        iconUrl: "https://bneteu-a.akamaihd.net/account/static/local-common/images/game-icons/d2dv-32.4PqK2.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//70/23fd57c691805861a899eabaa12f39f5-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//7f/a31777e05911989e7839ea02435c9eb5-prod-card-tall.jpg",
        name: "Diablo II",
        type: BNetAppType.Classic,
        classicExecutable: "Diablo II.exe"
    },
    {
        productId: "D2X",
        internalId: "Diablo II",
        iconUrl: "https://bneteu-a.akamaihd.net/account/static/local-common/images/game-icons/d2xp.1gR7W.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//f9a/3935e198b09577d63a394ee195ddec2e-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//4/cb3a7d551cb3524c5a8c68abacd4fda9-prod-card-tall.jpg",
        name: "Diablo II: Lord of Destruction",
        type: BNetAppType.Classic,
        classicExecutable: "Diablo II.exe"
    },
    {
        productId: "W3",
        internalId: "Warcraft III",
        iconUrl: "https://bneteu-a.akamaihd.net/account/static/local-common/images/game-icons/war3-32.1N2FK.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//11/b924dd7257d4728f314822837d9a5e68-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//42/a4e5b0ccd23d09ad34e7c0a074bb4c11-prod-card-tall.jpg",
        name: "Warcraft III: Reign of Chaos",
        type: BNetAppType.Classic,
        classicExecutable: "Warcraft III Launcher.exe"
    },
    {
        productId: "W3X",
        internalId: "Warcraft III",
        iconUrl: "https://bneteu-a.akamaihd.net/account/static/local-common/images/game-icons/w3xp-32.15Wgr.png",
        backgroundUrl: "https://bnetproduct-a.akamaihd.net//7/f79aee74f037d9c3a44736ecccc4373a-prod-mobile-bg.jpg",
        coverUrl: "http://bnetproduct-a.akamaihd.net//fd9/a4b9e92295e20508bb62a0756577e925-prod-card-tall.jpg",
        name: "Warcraft III: The Frozen Throne",
        type: BNetAppType.Classic,
        classicExecutable: "Warcraft III Launcher.exe"
    }
];
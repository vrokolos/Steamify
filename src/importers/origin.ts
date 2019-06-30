import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import klaw = require("klaw-sync");
import fetch from "node-fetch";
import { Utils } from "../utils";

export class Origin implements IImporter {

    public async getInstalledGames(): Promise<Game[]> {

        let contentPath = path.join(process.env.ALLUSERSPROFILE, "Origin", "LocalContent");
        let games: Game[] = [];

        if (fs.existsSync(contentPath)) {
            let opts: klaw.Options = { nodir: true, filter: file => path.extname(file.path) == ".mfst", traverseAll: true };
            const packages = klaw(contentPath, opts);
            for (let thePackage of packages) {
                try {
                    let gameId = path.basename(thePackage.path, ".mfst");
                    if (!gameId.startsWith("Origin")) {
                        let match = /^(.*?)(\d+)$/.exec(gameId);
                        if (match == null) {
                            console.log("Failed to get game id from file " + thePackage.path);
                            continue;
                        }
                        gameId = match[1] + ":" + match[2];
                    }
                    let newGame = new Game();
                    let localData: GameLocalDataResponse = null;
                    try {
                        localData = await this.getGameLocalData(gameId);
                    } catch (e) {
                        console.log(e, `Failed to get Origin manifest for a ${gameId}, ${thePackage.path}`);
                        continue;
                    }
                    if (localData.offerType != "Base Game" && localData.offerType != "DEMO") {
                        continue;
                    }

                    newGame.name = localData.localizableAttributes.displayName;
                    newGame.poster = (<any>localData).customAttributes.imageServer + (<any>localData).localizableAttributes.packArtLarge;
                    let platform = localData.publishing.softwareList.software.find(a => a.softwarePlatform == "PCWIN");

                    if (platform == null) {
                        console.log(gameId + " game doesn't have windows platform, skipping install import.");
                        continue;
                    }

                    let installPath = await this.getPathFromPlatformPath(platform.fulfillmentAttributes.installCheckOverride);
                    if (installPath == "" || installPath == null || !fs.existsSync(installPath)) {
                        continue;
                    }
                    let action = await this.getGamePlayTask(localData);
                    if (action.type != "url") {
                        newGame.folder = path.dirname(action.path);
                        newGame.workFolder = action.workingDir.replace(newGame.folder + '\\', "").replace(newGame.folder, "");
                        newGame.exec = action.path.replace(newGame.folder + '\\', "").replace(newGame.folder, "");
                    } else {
                        newGame.exec = action.path;
                        newGame.folder = path.dirname(installPath);
                    }
                    newGame.tag = "Origin";
                    games.push(newGame);
                }
                catch (e) {
                    console.log(e, `Failed to import installed Origin game ${thePackage.path}.`);
                }
            }
        }

        Utils.logImport("ORIGIN", contentPath, games);
        return games;
    }

    private async getPathFromPlatformPath(thePath: string): Promise<string> {
        if (!thePath.startsWith("[")) {
            return thePath;
        }

        let matchPath = /\[(.*?)\\(.*)\\(.*)\](.*)/.exec(thePath);
        if (matchPath == null) {
            console.log("Unknown path format " + thePath);
            return "";
        }

        let root = matchPath[1];
        let subPath = matchPath[2];
        let key = matchPath[3];
        let executable = matchPath[4];
        let thekey = (root == "HKEY_LOCAL_MACHINE" ? "HKLM" : "HKCU") + '\\' + subPath;
        let subKey = await Utils.GetReg(thekey);
        if (subKey == null) {
            return "";
        }
        if (subKey.values == null) {
            return "";
        }
        let keyValue = subKey.values[key].value;
        if (keyValue == null) {
            return "";
        }
        return path.join(keyValue.toString(), executable);
    }

    private async getGameLocalData(gameId: string): Promise<GameLocalDataResponse> {
        let url = `https://api1.origin.com/ecommerce2/public/${gameId}/en_US`;
        let apiData = await fetch(url);
        let data = await apiData.json();
        return data;
    }

    private async getGamePlayTask(manifest: GameLocalDataResponse): Promise<{ type: string, path: string, workingDir: string }> {
        let platform = manifest.publishing.softwareList.software.find(a => a.softwarePlatform == "PCWIN");
        let playAction: { type: string, path: string, workingDir: string } = { type: null, path: null, workingDir: null };

        if (platform.fulfillmentAttributes.executePathOverride == '' || platform.fulfillmentAttributes.executePathOverride == null) {
            return null;
        }

        if (platform.fulfillmentAttributes.executePathOverride.indexOf("://") > -1) {
            playAction.type = "url";
            playAction.path = platform.fulfillmentAttributes.executePathOverride;
        } else {
            let executePath = await this.getPathFromPlatformPath(platform.fulfillmentAttributes.executePathOverride);
            if (executePath.endsWith("installerdata.xml")) {
                let doc = fs.readFileSync(executePath, 'utf8');
                let root = await Utils.xml2json(doc);
                root = root.DiPManifest;
                if (root != null && root.runtime != null && root.runtime[0] != null && root.runtime[0].launcher != null && root.runtime[0].launcher[0] != null && root.runtime[0].launcher[0].filePath != null && root.runtime[0].launcher[0].filePath[0] != null) {
                    let thePath = root.runtime[0].launcher[0].filePath[0];
                    if (thePath != null) {
                        executePath = await this.getPathFromPlatformPath(thePath);
                        playAction.workingDir = path.dirname(executePath);
                        playAction.path = executePath;
                    }
                }
            }
            else {
                playAction.workingDir = path.dirname(await this.getPathFromPlatformPath(platform.fulfillmentAttributes.installCheckOverride));
                playAction.path = executePath;
            }
        }
        return playAction;
    }

}

class LocalizableAttributes {
    public longDescription: string;
    public displayName: string;
}

class FulfillmentAttributes {
    public executePathOverride: string;
    public installationDirectory: string;
    public installCheckOverride: string;
}
class SoftwareList {
    public software: Software[];
}

class Publishing {
    public softwareList: SoftwareList;
}

class GameLocalDataResponse {
    public offerId: string;
    public offerType: string;
    public publishing?: Publishing;
    public localizableAttributes?: LocalizableAttributes;
}

class Software {
    public softwareId: string;
    public softwarePlatform: string;
    public fulfillmentAttributes: FulfillmentAttributes;
}

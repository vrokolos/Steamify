import { Game } from "../game";
export interface IImporter {
    getInstalledGames(libPath: string): Promise<Game[]>;
}

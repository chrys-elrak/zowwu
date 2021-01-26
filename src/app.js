import fs from "fs";
import path from "path";

import polka from "polka";
import { jsonSend, statusSend } from "~/utils";

// initial polka
const app = polka();

app.use(statusSend).use(jsonSend);

const load = (entryPoint = "api", fullPath) =>
    new Promise((resolve, reject) => {
        if (!fullPath) {
            fullPath = entryPoint;
        }
        /**
         * prevent folder path error
         */
        if (!fullPath.endsWith("/")) {
            fullPath = fullPath + "/";
        }

        if (!path.isAbsolute(fullPath)) {
            fullPath = `${__dirname}/${fullPath}`;
        }

        /**
         * read files and folders
         */

        fs.readdir(fullPath, (err, files) => {
            /**
             * ignore hidden files
             */
            files = files.filter((item) => !/(^|\/)\.[^\/\.]/g.test(item));
            files.forEach((file) => {
                if (fs.statSync(`${fullPath}${file}`).isDirectory()) {
                    load(entryPoint, `${fullPath}${file}`);
                    return;
                } else {
                    /**
                     * throw error if no index.js file found
                     */
                    if (!files.includes("index.js"))
                        throw new Error("No index.js file found");

                    if (file === "index.js") {
                        const {
                            routes,
                            before = (req, res, next) => next(),
                        } = require(`${fullPath}${file}`).default;

                        /**
                         * get folder tree informations
                         */
                        const treePath = fullPath
                            .slice(0, -1)
                            .substring(
                                fullPath
                                    .slice(0, -1)
                                    .lastIndexOf(`${entryPoint}/`) +
                                    entryPoint.length
                            );

                        /**
                         * route global before function
                         */
                        if (before.constructor === Array) {
                            before.forEach((b) => {
                                app.use(async (req, res, next) => {
                                    if (req.url.startsWith(treePath)) {
                                        await b(req, res, next);
                                    }
                                    next();
                                });
                            });
                        } else {
                            app.use(async (req, res, next) => {
                                if (req.url.startsWith(treePath)) {
                                    await before(req, res, next);
                                }
                                next();
                            });
                        }

                        /**
                         * throw error if no routes defined
                         */
                        if (!routes?.length) {
                            throw new Error("No routes found");
                        }

                        /**
                         * assign information to route
                         */
                        routes.forEach(
                            ({
                                method = "GET",
                                path,
                                before = (req, res, next) => next(),
                                action,
                            }) => {
                                app[method.toLowerCase()](
                                    treePath + path,
                                    before,
                                    action
                                );
                            }
                        );
                    }
                }
            });
        });
        resolve(app);
    });

export default load;

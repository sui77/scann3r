module.exports = {

    createLogger: (options) => {

        return {
            info: (msg) => {
                console.log(`Info: ${options.name} ${msg}`);
            },
            error: (msg) => {
                console.log(`Error: ${options.name} ${msg}`);
            },
            debug: (msg) => {
                console.log(`Debug: ${options.name} ${msg}`);
            }
        }
    }
}
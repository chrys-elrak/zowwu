const loader = require("./../lib/app");

loader().then((app) => {
    app.listen(3000, (err) => {
        if (err) throw err;
        console.log(`> Running on localhost:3000`);
    });
});

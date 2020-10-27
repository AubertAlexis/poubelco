const express = require("express");
const fs = require("fs");
const path = require("path");
const vision = require('@google-cloud/vision');
const cors = require("cors");

const app = express();
const client = new vision.ImageAnnotatorClient();

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))

// parse application/json
app.use(express.json())

// // Automatically allow cross-origin requests
app.use(cors({ origin: true }));

app.use('/static', express.static(__dirname + '/public'));
/**
 * TODO(developer): Uncomment the following line before running the sample.
 */
// const fileName = process.cwd() + '/Lenovo-IdeaPad-3-CB-11IGL05-Chromebook-3-1.jpg';
// console.log(fileName)

function savePicture(picture) {
    return new Promise((resolve, reject) => {
        let extension = picture.split("/")[1].split(";")[0]
        let reg = new RegExp('^data:image\\/' + extension + ';base64,')
        let pictureFormated = picture.replace(reg, "")
        fs.writeFile("out." + extension, pictureFormated, "base64", (err) => {
            if (err) reject(err);
            resolve(extension)
            console.log(extension)
        })
    })
}

async function readFileAsync(filedir) {
    return new Promise((resolve, reject) => {
        fs.readFile(filedir, (err, data) => {
            if (err) reject(err);
            resolve(data)
        });
    })
}

async function labelOnImage(image) {
    // const request = {
    //     image: { content: Buffer.from(image, 'utf8') },
    // };
    try {
        const extension = await savePicture(image)
        const file = await readFileAsync(process.cwd() + "/out." + extension)
        const request = {
            image: { content: file },
        };
        console.log("request ", request)
            // const [result] = await client.labelDetection(process.cwd() + "/out.jpeg");
        const [result] = await client.objectLocalization(request)
        const objects = result.localizedObjectAnnotations;
        objects.forEach(object => {
            console.log(`Name: ${object.name}`);
            console.log(`Confidence: ${object.score}`);
            const vertices = object.boundingPoly.normalizedVertices;
            vertices.forEach(v => console.log(`x: ${v.x}, y:${v.y}`));
        });
        // const labels = result.labelAnnotations;
        // console.log('Labels:');
        // console.log(labels);
        console.log("objects ", objects)
        return objects.map(object => object.name)
    } catch (error) {
        throw new Error("IMAGE ML: " + error.message)
    }
}

app
    .route("/")
    .get((request, response) => {
        console.log(path.resolve("./src/index.html"))
        response.status(200).sendFile(path.join(__dirname, "index.html"));
    })
    .post(async(req, res) => {
        // console.log(req.body)
        let { image } = req.body
        if (image) {
            try {
                let labels = await labelOnImage(image)
                res.status(200).json(labels)
            } catch (err) {
                res.status(400).json({ error: err.message })
            }
            return
        }
        res.status(403).json({ error: "not image found" })
    })


app.listen(3003)
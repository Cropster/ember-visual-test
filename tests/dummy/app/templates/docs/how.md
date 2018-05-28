## How does it work?

Whenever `capture` is called in the test, the node server will make a screenshot with 
[simple-headless-chrome](https://github.com/LucianoGanga/simple-headless-chrome), 
and save it in the `/visual-test-output/baseline` folder. Please commit this folder into source control!

Now, whenever the test is run, a new snapshot is made and put in the `/visual-test-output/tmp` folder 
(do NOT put that into source control!). It then compares the two images with 
[pixelmatch](https://github.com/mapbox/pixelmatch) and asserts accordingly. 
If a mismatch is found, it will save an image with the diff of the two versions in the `/visual-test-output/diff` folder, to help you identify the issue.

Note that this means that if a screen changes consciously, you'll need to either manually 
delete that image from the `/visual-test-output/baseline` folder, 
or run `ember visual-test:reset` to reset ALL images.

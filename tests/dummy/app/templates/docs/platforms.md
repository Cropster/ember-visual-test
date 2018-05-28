### Note on different platforms / CI

Sadly, the font rendering is slightly different on different platforms (Windows/Linux/MaxOS). 
This can lead to comparison errors when comparing a baseline image generated on one platform, with one on another platform.
This is especially problematic on CI (e.g. Travis or CircleCI), if your local machine doesn't run on Linux.

To prevent wrong errors to pop up there, this addon will by default namespace the images with the OS, 
and thus generate a different set of baseline (and comparison) images for windows/linux/mac. 
Of course, this also means that if you generate baseline images on your PC, and then run tests on Linux, 
it will not actually compare the images, and will always succeed. 
However, this is still preferable to tests always failing. 
You can also put multiple different baseline images into Git, to let the test compare to the fitting one.

For information on how to turn on the by-OS comparison, see the settings section below.

### Styling

When running in capture mode (in node), the `capture` helper will automatically add a class 
`visual-test-capture-mode` to the body. Styles are injected when running tests that use that 
class to hide the qunit-specific chrome & make the test view full screen.

If you want to "ignore" some element in the capture (e.g. because it changes in every rendering), 
you can add the attribute `data-test-visual-ignore` to it, which will give it an opacity of 0 
when run in capture mode.

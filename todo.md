
### Active
[ ] contractions
[ ] get this shit in git/github
[ ] suggestion titles? -- Do I need to generalize suggestions a little more?
[ ] single-letter (A/I) collision with overall letter frequency.  Both divs appear when 1-letter-word is selected
[ ] Hey... How about some tests
[ ] explore other quote sources
[ ] show unchosen letters somewhere (perhaps as hints for clear-text focus)
[ ] add "BS" elimination mechanism for weird words in the list
[ ] visually highlight words with 1 suggestion and missing letters

### observe
[ ] explore odd character in today's dump ' --- looks like it was present all the way back to the XML.  wait for more.
[ ] it's mistakenly adds a 3-letter word, its.  What should it do? Perhaps the contractions feature is enough.

### Are these worth it?
[ ] ALT-Tab/ALT-Shift-Tab to skip to next/prev unknown character
[ ] overwrite mode for typing (type a letter, focus moves to the next letter)
[ ] start characters
[ ] end characters
[ ] move URLs out to constants for easier mocking
[ ] move puzzle generation to a service

### DONE
[x] localStorage for key and cryptext
[x] eliminate repeat showings of puzzles
[x] shouldn't mistakenly adds a 1-letter word, 't.  fix me.
[x] why is syntax highlighting broken for this file?
[x] limit size of "seen" to something 
[x] suggestions for 1, 2 and 3-character words
[x] high-frequency letter
[x] eliminate timeout loop on "next" button/better startup
[x] eliminate trailing "DISCUSS" when found
[x] clean up usage of localStorage - 
[x] reload is broken after localStorage cleanup (key and hints aren't populating)
[x] fix individual letter suggestion highlight
[x] sometimes it seems like a puzzle is repeated.  Explore - change [master c6a6114]
[X] hint?
[X] new puzzle structure (simpler implementation REVISIT LATER) 
    - clear text (for hints)
    - key (for hints) (OPTED AGAINST THIS)
    - cryptext (for presentation)
    - original (for post-solution presentation)
[x] correct completion indication/progress indicator
[x] pare suggestions by regular expresstion matches (i.e. CVV -> TOO, SEE, etc.)
[x] sort suggestions by consistency with current key settings
[x] highlight hint letters that are consistent with current key settings
[x] doubled letters (implicity with new winnowing mechanism)
[x] get rid of the update cryptext grossness
[x] page reload got broken.  key is not getting remembered anymore.
[x] key has unnecessary entries after puzzle load.  it is ok after page load.
[x] Add I to the word list
[x] refactor hints by length to either a) eliminate unnecessary divs and make enough divs or b) sort by # of suggestions
[x] fix 1-letter suggestions for new suggestion mechanism
[x] indicate which letters have a value in the key when presenting a suggestion
[x] undo/rollback feature
[x] don't insert redundant characters in take-hint() 
      - repeated letters in hint word
      - letters already set in key (if they agree with the hint)
[x] big hints are not generated on page reload (until a key change or puzzle load)
[x] rethink suggestions service - to make it more watch()able and fix initial hint generation (nope, just $broadcast)
[x] turn off highlighting when puzzle is complete
[ ] eliminate words that are all numbers

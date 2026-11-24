# make video STORY=green-fog LANG=en   (LANG defaults to en)
STORY ?= green-fog
LANG ?= en
.PHONY: voice stills video cover all studio typecheck voices new
voice:   ; python3 tools/build.py voice  $(STORY) $(LANG)
stills:  ; python3 tools/build.py stills $(STORY) $(LANG) $(SHOTS)
video:   ; python3 tools/build.py video  $(STORY) $(LANG)
cover:   ; python3 tools/build.py cover  $(STORY) $(LANG)
all:     ; python3 tools/build.py all    $(STORY) $(LANG)
new:     ; python3 tools/build.py new    $(STORY)
voices:  ; python3 tools/voicelab.py $(LANG)
studio:  ; npx remotion studio
typecheck: ; npx tsc --noEmit

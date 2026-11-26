# Presentation

`EnterpriseOS-AWS-Presentation.pptx`: 10 slides, 16:9, with speaker notes on every slide.

Replace `[Course Code]` on slide 1 before presenting. After a verified deployment, update
slide 1's status pill, the legend on slide 3 and slide 9 ("Status and future scope").

To regenerate after editing `build-deck.cjs` (needs `pptxgenjs`):

```bash
NODE_PATH=/path/to/node_modules node presentation/build-deck.cjs /path/to/apply_theme.js
```

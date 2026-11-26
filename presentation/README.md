# Presentation

`EnterpriseOS-AWS-Presentation.pptx`: 14 slides, 16:9, with speaker notes on every slide:
title, the idea, architecture, one slide per AWS service (API Gateway, Lambda, SQS, SNS,
Parameter Store + KMS, CloudWatch, IAM, CloudFormation + SAM + S3), how we deployed, live proof, conclusion.

To regenerate after editing `build-deck.cjs` (needs `pptxgenjs`):

```bash
NODE_PATH=/path/to/node_modules node presentation/build-deck.cjs /path/to/apply_theme.js
```

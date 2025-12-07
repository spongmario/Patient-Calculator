# Managing Documents

All documents are stored in the `documents/` folder and managed through GitHub. This ensures all users see the same documents.

## Folder Structure

```
documents/
├── pathways/              # Clinical pathway PDFs
├── pt-guides/            # Physical therapy guide PDFs
├── handouts/             # Patient resources, flyers, and handouts
├── pathways-manifest.json # List of clinical pathways
├── pt-manifest.json      # List of PT guides
├── handouts-manifest.json # List of patient resources
└── custom-display-names.json # Custom display names for files
```

## Adding Documents

### Clinical Pathways
1. Add your PDF file to `documents/pathways/`
2. Edit `documents/pathways-manifest.json` and add an entry:
```json
{
  "name": "Your Document Name.pdf",
  "file": "pathways/Your Document Name.pdf",
  "type": "pdf"
}
```

### Physical Therapy Guides
1. Add your PDF file to `documents/pt-guides/`
2. Edit `documents/pt-manifest.json` and add an entry:
```json
{
  "name": "Your PT Guide.pdf",
  "file": "pt-guides/Your PT Guide.pdf",
  "type": "pdf"
}
```

### Patient Resources (Handouts)
1. Add your PDF file to `documents/handouts/`
2. Edit `documents/handouts-manifest.json` and add an entry:
```json
{
  "name": "Your Handout.pdf",
  "file": "handouts/Your Handout.pdf",
  "type": "pdf"
}
```

## Custom Display Names

Admins can rename how documents appear to users without changing the actual file name.

1. Log in as admin on the website
2. Click "Rename" on any document
3. Enter the new display name
4. A modal will show the updated JSON - copy it
5. Update `documents/custom-display-names.json` with the copied content
6. Commit and push to GitHub

The JSON structure:
```json
{
  "pathways": {
    "pathways/Your File.pdf": "Custom Display Name"
  },
  "ptGuides": {
    "pt-guides/Your File.pdf": "Custom Display Name"
  },
  "handouts": {
    "handouts/Your File.pdf": "Custom Display Name"
  }
}
```

## Important Notes

- Files are sorted alphabetically by name
- All JSON files must be valid JSON
- After adding files, commit and push to GitHub
- Documents will be visible to all users once pushed
- Custom display names are stored in `custom-display-names.json`


---
title: "Gen Cli"
date: 2026-03-27
tags: []
---

Framework templates

```bash
	gen <programming language> <framework>
```


list of commands:


### Single file Creation

```bash
gen <filename.extension>
gen <filename.extension> --dryrun # cat the boiler plate code
gen <filename.extension> --overwrite # Overwrite the existing file 
```


### Template Creation 


```bash 
gen new <project/dirname> --lang/<custom> --<template> # create project/dir using template

# Dryrun (Yet to implement)
gen new <project/dirname> --lang/<custom> --<template> --dryrun # print template structure
```


### File View (Gen Tree)

```bash
gen tree # just like ls command but creates tree view (default: depth = 1)
gen tree -n # (n = {1, 2, 3 ...})
gen tree -r # (Recursive until last)
```


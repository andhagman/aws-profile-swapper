#!/usr/bin/env node

const program = require('commander');
const switchProfile = require('./src/switch-profile');
const version = require('./package.json').version;

program
    .version(version)
    .option('-p, --profile <profile>', 'Name of the AWS profile')
    .action(async (cmd) =>{
        await switchProfile(cmd.profile)
    })

program.parse(process.argv);
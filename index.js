const program = require('commander');
const chalk = require('chalk');
const lineReader = require('line-reader');
const shell = require('shelljs');
var inquirer = require('inquirer');


const home = process.env['HOME']
const platform = process.platform;

const profileRegex = /\[.*]/g;
const bracketsRegex = /[\[\]]/g;
const emtpylineRegex = /\r?\n|\r/;

program
    .version('0.1.0')
    .option('-p, --profile', 'Name of the AWS profile')
    .option('-r, --region', 'Set the target region')
    .command('configure', 'Create a new profile in ./aws/credentials')
    .parse(process.argv);

if (!program.profile) {
    console.error(chalk.red("Missing required argument: -p <profile-name>"))
}

const inputProfile = program.args[0];
const region = program.args[1] || 'eu-west-1';

const awsSwitchProfile = async () => {
    const role_arn = shell.exec(`aws configure get role_arn --profile ${inputProfile}`, { silent: true });
    const key_exists = shell.exec(`aws configure get aws_access_key_id --profile ${inputProfile}`, { silent: true });
    const mfa_serial = shell.exec(`aws configure get mfa_serial --profile ${inputProfile}`, { silent: true });

    if (key_exists && !role_arn) {
        const aws_access_key_id = shell.exec(`aws configure get aws_access_key_id --profile ${inputProfile}`, { silent: true });
        const aws_secret_access_key = shell.exec(`aws configure get aws_secret_access_key --profile ${inputProfile}`, { silent: true });
        const session_token = shell.exec(`aws configure get aws_access_key_id --profile ${inputProfile}`, { silent: true });
        const region = shell.exec(`aws configure get region --profile ${inputProfile}`, { silent: true });

        shell.exec(`aws configure set aws_access_key_id ${aws_access_key_id}`)
        shell.exec(`aws configure set aws_secret_access_key ${aws_secret_access_key}`)
        shell.exec(`aws configure set session_token ${session_token}`)
        shell.exec(`aws configure set region ${region}`)
        if (mfa_serial) {
            await awsMfaAuthenticate(mfa_serial.stdout.replace(emtpylineRegex, ''));
        }
        // console.log(`Assumed profile: ${inputProfile}`);
    } else if (role_arn) {
        await awsAssumeRole(role_arn);
    }
}

const awsAssumeRole = async (role_arn) => {
    const source_profile_raw = shell.exec(`aws configure get source_profile --profile "${inputProfile}"`);
    const source_profile = source_profile_raw.replace(emtpylineRegex, '');
    const role_session_name = shell.exec(`aws iam get-user --query User.UserName --output text --profile "${inputProfile}"`);
    const mfa_serial_raw = shell.exec(`aws configure get mfa_serial --profile "${source_profile}"`);
    const mfa_serial = mfa_serial_raw.replace(emtpylineRegex, '');
  
    let credentials_raw;
    if (mfa_serial) {
        const { mfa_token } = await inquirer.prompt([
            {
                message: "Enter MFA token (6 digits) for profile",
                type: "input",
                name: "mfa_token"
            }
        ]);

        credentials_raw = shell.exec(`aws sts assume-role --query Credentials.[AccessKeyId,SecretAccessKey,SessionToken] --role-arn "${role_arn}" --role-session-name cli-"${role_session_name}" --serial-number "${mfa_serial}" --token-code "${mfa_token}" --duration-seconds 43200 --profile "${source_profile}" --output json`)
    } else {
        credentials_raw = shell.exec(`aws sts assume-role --query Credentials.[AccessKeyId,SecretAccessKey,SessionToken] --role-arn "${role_arn}" --role-session-name cli-"${role_session_name}" --profile "${source_profile}" --output json`)
    }

    if (credentials_raw.stdout) {
        const credentials = JSON.parse(credentials.raw);
        shell.exec(`aws configure set default.aws_access_key_id "${credentials[0]}"`);
        shell.exec(`aws configure set default.aws_secret_access_key "${credentials[1]}"`);
        shell.exec(`aws configure set default.aws_session_token "${credentials[2]}"`);
    }
};

const awsMfaAuthenticate = async (mfa_serial) => {
    const { mfa_token } = await inquirer.prompt([
        {
            message: "Enter MFA token (6 digits) for profile",
            type: "input",
            name: "mfa_token"
        }
    ]);
    const credentials_raw = shell.exec(`aws sts get-session-token --query Credentials.[AccessKeyId,SecretAccessKey,SessionToken] --serial-number "${mfa_serial}" --token-code "${mfa_token}" --profile ${inputProfile} --output json`, { silent: true });
    if (credentials_raw.stdout) {
        const credentials = JSON.parse(credentials_raw);
        shell.exec(`aws configure set default.aws_access_key_id "${credentials[0]}"`)
        shell.exec(`aws configure set default.aws_secret_access_key "${credentials[1]}"`);
        shell.exec(`aws configure set default.aws_session_token "${credentials[2]}"`);
        shell.exec(`aws configure set aws_access_key_id "${credentials[0]}" --profile ${inputProfile}-temp`);
        shell.exec(`aws configure set aws_secret_access_key "${credentials[1]}" --profile ${inputProfile}-temp`);
        shell.exec(`aws configure set aws_session_token "${credentials[2]}" --profile ${inputProfile}-temp`);
        console.log(`Enabled temporary session for profile ${inputProfile} as default and ${inputProfile}-temp`)
    } else {
        console.log(chalk.red('Invalid MFA code and/or serial id, not authenticated with MFA'))
    }
}


awsSwitchProfile().then();


const program = require('commander');
const chalk = require('chalk');
const shell = require('shelljs');
const inquirer = require('inquirer');

shell.config.silent = true;

const emtpylineRegex = /\r?\n|\r/;

program
    .version('0.1.0')
    .option('-p, --profile', 'Name of the AWS profile')
    .parse(process.argv);

if (!program.profile) {
    console.error(chalk.red("Missing required argument: -p <profile-name>"))
}

const inputProfile = program.args[0];

const switchProfile = async () => {
    const role_arn = shell.exec(`aws configure get role_arn --profile ${inputProfile}`);
    const key_exists = shell.exec(`aws configure get aws_access_key_id --profile ${inputProfile}`);
    const mfa_serial = shell.exec(`aws configure get mfa_serial --profile ${inputProfile}`);
    if (Boolean(key_exists.stdout)) {
        const aws_access_key_id = shell.exec(`aws configure get aws_access_key_id --profile ${inputProfile}`).stdout.replace(emtpylineRegex, '');
        const aws_secret_access_key = shell.exec(`aws configure get aws_secret_access_key --profile ${inputProfile}`).stdout.replace(emtpylineRegex, '');;
        const session_token = shell.exec(`aws configure get aws_session_token --profile ${inputProfile}`).stdout.replace(emtpylineRegex, '');;
        const region = shell.exec(`aws configure get region --profile ${inputProfile}`).stdout.replace(emtpylineRegex, '');;

        shell.exec(`aws configure set aws_access_key_id ${aws_access_key_id}`)
        shell.exec(`aws configure set aws_secret_access_key ${aws_secret_access_key}`)

        if (session_token)
            shell.exec(`aws configure set session_token ${session_token}`)

        if (region)
            shell.exec(`aws configure set region ${region}`)

        if (Boolean(mfa_serial.stdout)) {
            await mfaAuth(mfa_serial.stdout.replace(emtpylineRegex, ''));
        }
    } else if (Boolean(role_arn.stdout)) {
        await assumeRole(role_arn.stdout.replace(emtpylineRegex, ''));
    } else {
        console.log(chalk.red(`Could not find profile: ${inputProfile}`))
    }
}

const assumeRole = async (role_arn) => {
    const source_profile = shell.exec(`aws configure get source_profile --profile "${inputProfile}"`).stdout.replace(emtpylineRegex, '');
    const role_session_name = shell.exec(`aws iam get-user --query User.UserName --output text --profile "${source_profile}"`).stdout.replace(emtpylineRegex, '');
    const mfa_serial = shell.exec(`aws configure get mfa_serial --profile "${source_profile}"`).stdout.replace(emtpylineRegex, '');

    let credentials_raw;
    if (mfa_serial) {
        const { mfa_token } = await inquirer.prompt([
            {
                message: "Enter MFA token (6 digits) for profile",
                type: "input",
                name: "mfa_token"
            }
        ]);
        credentials_raw = shell.exec(`aws sts assume-role --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' --role-arn "${role_arn}" --role-session-name cli-"${role_session_name}" --serial-number "${mfa_serial}" --token-code "${mfa_token}" --duration-seconds 43200 --profile "${source_profile}" --output json`)
    } else {
        credentials_raw = shell.exec(`aws sts assume-role --query Credentials.[AccessKeyId,SecretAccessKey,SessionToken] --role-arn "${role_arn}" --role-session-name cli-"${role_session_name}" --profile "${source_profile}" --output json`)
    }

    if (credentials_raw.stdout) {
        const credentials = JSON.parse(credentials_raw);
        shell.exec(`aws configure set default.aws_access_key_id "${credentials[0]}"`);
        shell.exec(`aws configure set default.aws_secret_access_key "${credentials[1]}"`);
        shell.exec(`aws configure set default.aws_session_token "${credentials[2]}"`);
        console.log(chalk.green(`Enabled session for profile ${inputProfile} as default and ${inputProfile}`));
    }
};

const mfaAuth = async (mfa_serial) => {
    const { mfa_token } = await inquirer.prompt([
        {
            message: "Enter MFA token (6 digits) for profile",
            type: "input",
            name: "mfa_token"
        }
    ]);
    const credentials_raw = shell.exec(`aws sts get-session-token --query Credentials.[AccessKeyId,SecretAccessKey,SessionToken] --serial-number "${mfa_serial}" --token-code "${mfa_token}" --profile ${inputProfile} --output json`);
    if (credentials_raw.stdout) {
        const credentials = JSON.parse(credentials_raw.stdout);
        shell.exec(`aws configure set default.aws_access_key_id "${credentials[0]}"`)
        shell.exec(`aws configure set default.aws_secret_access_key "${credentials[1]}"`);
        shell.exec(`aws configure set default.aws_session_token "${credentials[2]}"`);
        shell.exec(`aws configure set aws_access_key_id "${credentials[0]}" --profile ${inputProfile}-temp`);
        shell.exec(`aws configure set aws_secret_access_key "${credentials[1]}" --profile ${inputProfile}-temp`);
        shell.exec(`aws configure set aws_session_token "${credentials[2]}" --profile ${inputProfile}-temp`);
        console.log(chalk.green(`Enabled temporary session for profile ${inputProfile} as default and ${inputProfile}-temp`));
    } else {
        console.log(chalk.red('Invalid MFA code and/or serial id, not authenticated with MFA'))
    }
}




switchProfile()
    .then()
    .catch(err => {
        console.log(chalk.red({
            error: err.message,
            message: 'Please report issues at https://github.com/andhagman/aws-profile-swapper/issues'
        }))
    });


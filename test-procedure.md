# Test procedure

This document is available at https://eng-git.canterbury.ac.nz/seng365-2021/assignment2-server/blob/master/test-procedure.md.

You have three applications to test in this session. All applications are bundled into a single compressed tar archive named `<your-usercode>.tar.gz` in the directory: `/netfs/cdb/seng365`.

## Getting ready (do this section once only)
1. Ensure that you have bypassed the firewall using either:
    1. Python Internet Enabler
    2. Open a terminal and run `telnet ienabler 259`, enter your username and password and choose (1) Standard Sign-on.
2. Open a terminal window
2. **IMPORTANT**: Navigate to the local directory on your workstation: `cd /local`
2. Copy the tar archive identified by your usercode `cp /netfs/cdb/seng365/<your-usercode>.tar.gz .` (the dot on the end is important), where `<your-usercode>` should be replaced by your usercode, e.g. `abc123`
3. Extract the tar archive to your directory: `tar xzf <your-usercode>.tar.gz`. You should now see three files, each named `assignment-<id>.zip`, where `<id>` is a unique identifier for each application
4. Clone the latest version of the server from eng-git by running `git clone https://eng-git.canterbury.ac.nz/seng365-2020/assignment2-server` and navigate into it by running `cd assignment2-server`
5. In the cloned directory, add a file named `.env` containing the following (replace the username, password, and database with your own details, and make sure the database exists):
```
SENG365_MYSQL_HOST=db2.csse.canterbury.ac.nz
SENG365_MYSQL_USER={your usercode}
SENG365_MYSQL_PASSWORD={your password}
SENG365_MYSQL_DATABASE={a database starting with your usercode then an underscore}
```
For example:
```
SENG365_MYSQL_HOST=db2.csse.canterbury.ac.nz
SENG365_MYSQL_USER=abc123
SENG365_MYSQL_PASSWORD=password
SENG365_MYSQL_DATABASE=abc123_s365_testing
```
4. In the directory of the server run `npm install`,  then `npm start` to ensure the latest version of the server is installed and running

## Test procedure for each application (do this section 3 times)
**If something doesn't work as expected, keep calm and carry on.**

For ***each*** application to be tested:

1. Reset the data on the server using cURL (or Postman):
    1. Execute `curl -X POST localhost:4941/api/v1/reload`
2. Open a terminal window and navigate to the directory with the zip file
3. In the terminal window at the directory containing the `assignment-<id>.zip` files:
    1. Unzip the zip file: `unzip assignment-<id>.zip -d test-<id>`
    2. Navigate into the unzipped directory using `cd test-<id>`
    3. If that directory does not contain the application's `package.json` file (check using `ls`), `cd` into the subdirectory that does contain the `package.json` file
    4. Run `npm install` (this might take some minutes)
    5. Run `npm run dev` (if Chromium opens, minimise it)
4. Using ***Chrome***, open a new incognito mode window using **Ctrl+Shift+N** and go to http://localhost:8080
5. In a separate browser window, open the following Google Form: XXX
6. In the Google Form:
    1. Enter the application's `<id>` from `assignment-<id>.zip` for the question "What is the ID of the application you are testing?"
    2. Select your usercode from the dropdown called "What is your usercode?"
7. Follow the step-by-step instructions presented in the Google Form.
    1. Note the preconditions for each test, for example whether you need to be logged in
    3. Select the option that best matches what you see. Provide clarifying comments where appropriate
    3. If a test fails, or it is not possible to complete a test, continue with the next test
8. Finally, enter your overall assessment of the system in the remaining areas: 
    * Overall ease-of-use (from your experience while testing)
    * Visual appeal and general creativity

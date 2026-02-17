function validate(){
    var nameText = document.getElementById('name-id').value;
    var emailText = document.getElementById('email-id').value;
    var passwordText = document.getElementById('password-id').value;

    var emailString = '@gmail.com' || '@outlook.com';

    if(nameText.trim() == "" || emailText.trim() == "" || passwordText.trim() == ""){
        alert('Some input field is missing')
        clearInput()
        return;
    }else if(!emailText.trim().toLowerCase().includes(emailString)){
        alert('Email is wrong')
        clearInput()
        return;
    }

    clearInput();

}


function clearInput(){
    document.getElementById('name-id').value = "";
    document.getElementById('email-id').value = "";
    document.getElementById('password-id').value = "";

}


document.getElementById('button-id').addEventListener('click', validate)
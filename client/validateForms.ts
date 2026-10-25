/**
 * validateForms.ts — Bootstrap 5 client-side form validation
 * Compiled to: public/javascripts/validateForms.js
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const forms = document.querySelectorAll<HTMLFormElement>('.form-validate');

  Array.from(forms).forEach((form) => {
    form.addEventListener(
      'submit',
      (event: Event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');
      },
      false,
    );
  });
});

/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, Divider, Form, Message, TextArea } from 'semantic-ui-react';
import { useDidUpdate, usePrevious, useToggle } from '../../../lib/hooks';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import { isUsername } from '../../../utils/validator';
import AccessTokenSteps from '../../../constants/AccessTokenSteps';
import TermsModal from './TermsModal';

import styles from './Content.module.scss';

const createMessage = (error, isDebug) => {
  if (!error) {
    return error;
  }

  switch (error.message) {
    case 'Invalid credentials':
      return {
        type: 'error',
        content: 'common.invalidCredentials',
      };
    case 'Invalid email or username':
      return {
        type: 'error',
        content: 'common.invalidEmailOrUsername',
      };
    case 'Invalid password':
      return {
        type: 'error',
        content: 'common.invalidPassword',
      };
    case 'Use single sign-on':
      return {
        type: 'error',
        content: 'common.useSingleSignOn',
      };
    case 'Admin login required to initialize instance':
      return {
        type: 'error',
        content: 'common.adminLoginRequiredToInitializeInstance',
      };
    case 'Email already in use':
      return {
        type: 'error',
        content: 'common.emailAlreadyInUse',
      };
    case 'Username already in use':
      return {
        type: 'error',
        content: 'common.usernameAlreadyInUse',
      };
    case 'Active users limit reached':
      return {
        type: 'error',
        content: 'common.activeUsersLimitReached',
      };
    case 'Failed to fetch':
      return {
        type: 'warning',
        content: 'common.noInternetConnection',
      };
    case 'Network request failed':
      return {
        type: 'warning',
        content: 'common.serverConnectionFailed',
      };
    default:
      return {
        type: 'warning',
        content: isDebug ? error.message : 'common.unknownError',
      };
  }
};

const Content = React.memo(() => {
  const bootstrap = useSelector(selectors.selectBootstrap);

  const {
    data: defaultData,
    isSubmitting,
    isSubmittingWithOidc,
    error,
    debugLogs,
    step,
  } = useSelector(selectors.selectAuthenticateForm);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const wasSubmitting = usePrevious(isSubmitting);

  const [data, handleFieldChange, setData] = useForm(() => {
    const initialData = {
      emailOrUsername: '',
      password: '',
      ...defaultData,
    };

    if (bootstrap.isDemoMode) {
      const params = new URLSearchParams(window.location.hash.slice(1));

      Object.keys(initialData).forEach((fieldName) => {
        const value = params.get(fieldName);

        if (value !== null) {
          initialData[fieldName] = value;
        }
      });
    }

    return initialData;
  });

  const withOidc = !!bootstrap.oidc;
  const isOidcEnforced = withOidc && bootstrap.oidc.isEnforced;
  const isOidcDebug = withOidc && bootstrap.oidc.debug;

  const message = useMemo(() => createMessage(error, isOidcDebug), [error, isOidcDebug]);
  const [focusPasswordFieldState, focusPasswordField] = useToggle();

  const [emailOrUsernameFieldRef, handleEmailOrUsernameFieldRef] = useNestedRef('inputRef');
  const [passwordFieldRef, handlePasswordFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      emailOrUsername: data.emailOrUsername.trim(),
    };

    if (!isEmail(cleanData.emailOrUsername) && !isUsername(cleanData.emailOrUsername)) {
      emailOrUsernameFieldRef.current.select();
      return;
    }

    if (!cleanData.password) {
      passwordFieldRef.current.focus();
      return;
    }

    dispatch(entryActions.authenticate(cleanData));
  }, [dispatch, data, emailOrUsernameFieldRef, passwordFieldRef]);

  const handleAuthenticateWithOidcClick = useCallback(() => {
    dispatch(entryActions.authenticateWithOidc());
  }, [dispatch]);

  const handleMessageDismiss = useCallback(() => {
    dispatch(entryActions.clearAuthenticateError());
  }, [dispatch]);

  useEffect(() => {
    if (!isOidcEnforced) {
      emailOrUsernameFieldRef.current.focus();
    }
  }, [isOidcEnforced, emailOrUsernameFieldRef]);

  useDidUpdate(() => {
    if (wasSubmitting && !isSubmitting && error) {
      switch (error.message) {
        case 'Invalid credentials':
        case 'Invalid email or username':
          emailOrUsernameFieldRef.current.select();

          break;
        case 'Invalid password':
          setData((prevData) => ({
            ...prevData,
            password: '',
          }));
          focusPasswordField();

          break;
        default:
      }
    }
  }, [isSubmitting, wasSubmitting, error]);

  useDidUpdate(() => {
    passwordFieldRef.current.focus();
  }, [focusPasswordFieldState]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          {/* Left panel: Login form */}
          <div className={styles.leftPanel}>
            <div className={styles.leftPanelContent}>
              {/* Error/Warning messages */}
              {message && (
                <Message
                  {...{
                    [message.type]: true,
                  }}
                  visible
                  content={t(message.content)}
                  onDismiss={handleMessageDismiss}
                  className={styles.message}
                />
              )}

              {/* Form */}
              <div className={styles.formContainer}>
                {!isOidcEnforced && (
                  <Form size="large" onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputWrapper}>
                      <Input
                        fluid
                        ref={handleEmailOrUsernameFieldRef}
                        name="emailOrUsername"
                        value={data.emailOrUsername}
                        placeholder="Username or email"
                        maxLength={256}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <Input.Password
                        fluid
                        ref={handlePasswordFieldRef}
                        name="password"
                        value={data.password}
                        placeholder="Password"
                        maxLength={256}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={styles.extraWrapper}>
                      <div className={styles.rememberMe}>
                        <input type="checkbox" id="remember" defaultChecked />
                        <label htmlFor="remember">Remember me</label>
                      </div>
                      <a href="#forgot" className={styles.forgotPassword} onClick={(e) => e.preventDefault()}>Forgot Password?</a>
                    </div>
                    <Form.Button
                      fluid
                      primary
                      content="Sign In"
                      loading={isSubmitting}
                      disabled={isSubmitting || isSubmittingWithOidc}
                      className={styles.submitButton}
                    />
                  </Form>
                )}
              </div>

              {/* Spacer at the bottom to balance the logo wrapper */}
              <div className={styles.footerSpacer} />
            </div>
          </div>

          {/* Right panel: Campus image */}
          <div className={styles.rightPanel}>
            <div className={styles.rightPanelImage} />
          </div>
        </div>
      </div>

      {step === AccessTokenSteps.ACCEPT_TERMS && <TermsModal />}
    </div>
  );
});

export default Content;

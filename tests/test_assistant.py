from physio_assistant import messages
from physio_assistant.analysis import findings as catalog
from physio_assistant.assistant import Assistant
from physio_assistant.domain.models import ExerciseMode, SessionRecord, ViewMode
from physio_assistant.events import Announcement, BodyLost, FindingChanged
from physio_assistant.ui.commands import SPACE, dispatch
from tests.conftest import InMemoryRepository
from tests.poses import arms_at, body, hold


def make(config, bus, clock, fixed_now, repo=None):
    return Assistant(config, bus, repo or InMemoryRepository(), clock, lambda: fixed_now)


def test_no_body_sets_guidance_and_publishes(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now)
    state = assistant.process(None)

    assert not state.body_detected
    assert state.guidance == list(messages.GUIDANCE_NO_BODY)
    assert bus.of_type(BodyLost)


def test_new_leading_finding_is_published_once(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now)
    tilted = body(left_shoulder=(420, 240))
    assistant.process(tilted)
    assistant.process(tilted)

    assert bus.of_type(FindingChanged) == [FindingChanged(catalog.SHOULDER_HEIGHT)]
    assert catalog.SHOULDER_HEIGHT.correction in assistant.frame.guidance


def test_finding_is_republished_after_it_clears(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now)
    tilted = body(left_shoulder=(420, 240))
    assistant.process(tilted)
    assistant.process(body())
    assistant.process(tilted)

    assert len(bus.of_type(FindingChanged)) == 2


def test_toggle_view_switches_analyzer(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now)
    assistant.toggle_view()

    assert assistant.view is ViewMode.SIDE
    assert bus.of_type(Announcement)[-1].message == messages.SPEAK_SIDE_VIEW


def test_select_mode_resets_counter(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now)
    assistant.select_mode(ExerciseMode.ARM_RAISE)
    hold(assistant.process, arms_at(10), clock, 0.8)
    hold(assistant.process, arms_at(100), clock, 0.8)
    assert assistant.counter.reps == 1

    assistant.select_mode(ExerciseMode.ARM_RAISE)
    assert assistant.counter.reps == 0


def test_save_session_persists_record(config, bus, clock, fixed_now):
    repo = InMemoryRepository()
    assistant = make(config, bus, clock, fixed_now, repo)
    assistant.select_mode(ExerciseMode.ARM_RAISE)
    assistant.toggle_timer()
    clock.advance(30)
    assistant.toggle_timer()
    clock.advance(100)
    assistant.toggle_timer()
    clock.advance(15)

    assert assistant.save_session()
    assert repo.records == [
        SessionRecord(
            date_time="2026-11-04T09:30:00",
            duration_seconds=45,
            view_mode="FRONT",
            exercise="ARM RAISE",
            repetitions=0,
            posture_observations="",
        )
    ]
    assert assistant.status_message == messages.SAVED
    assert assistant.progress.total_sessions == 1


def test_failed_save_reports_and_keeps_history(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now, InMemoryRepository(fail=True))

    assert not assistant.save_session()
    assert assistant.status_message == messages.SAVE_FAILED
    assert assistant.history == []


def test_key_dispatch_runs_commands_and_quits(config, bus, clock, fixed_now):
    assistant = make(config, bus, clock, fixed_now)

    assert dispatch(ord("2"), assistant)
    assert assistant.mode is ExerciseMode.ARM_RAISE
    assert dispatch(ord("V"), assistant)
    assert assistant.view is ViewMode.SIDE
    assert dispatch(SPACE, assistant)
    assert assistant.timer.running
    assert dispatch(255, assistant)
    assert not dispatch(ord("q"), assistant)
